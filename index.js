import { CopilotClient, approveAll } from '@github/copilot-sdk'

const DEFAULT_PROVIDER = 'ghc-local'
const DEFAULT_MODELS = ['gpt-5.3-codex', 'gpt-5']

function asText(content) {
  if (!Array.isArray(content)) return ''
  const chunks = []
  for (const block of content) {
    if (block?.type === 'text' || block?.type === 'reasoning') chunks.push(block.text ?? '')
    else if (block?.type === 'tool-call') chunks.push(`[tool-call:${block.name}] ${block.arguments ?? ''}`)
    else if (block?.type === 'image') chunks.push('[image]')
    else if (block?.type === 'file') chunks.push(`[file:${block.attachment?.name ?? 'attachment'}]`)
  }
  return chunks.join('\n').trim()
}

function buildPrompt(options) {
  const lines = []
  if (typeof options.system === 'string' && options.system.length > 0) lines.push(`System:\n${options.system}`)
  for (const message of options.messages ?? []) {
    const text = asText(message.content)
    if (text.length === 0) continue
    lines.push(`${message.role}:\n${text}`)
  }
  return lines.join('\n\n')
}

function toStopReason(error, signal) {
  if (signal?.aborted === true) {
    return {
      kind: 'aborted',
      failure: { code: 'ABORTED', message: 'Request aborted' },
    }
  }
  return {
    kind: 'error',
    failure: {
      code: 'GHC_LOCAL_ERROR',
      message: error instanceof Error ? error.message : String(error),
    },
  }
}

class GhcLocalAdapter {
  constructor(options = {}) {
    this.options = options
    this.client = undefined
    this.modelCache = undefined
  }

  providerInfo(provider) {
    const displayName = typeof this.options.displayName === 'string' && this.options.displayName.length > 0
      ? this.options.displayName
      : 'GitHub Copilot Local'
    return { id: provider, name: displayName }
  }

  async ensureClient() {
    if (this.client !== undefined) return this.client
    const client = new CopilotClient({
      workingDirectory: this.options.workingDirectory,
      ...this.options.baseDirectory === undefined ? {} : { baseDirectory: this.options.baseDirectory },
      useLoggedInUser: true,
    })
    await client.start()
    this.client = client
    return client
  }

  async listModels(provider) {
    const models = await this.fetchModels()
    return models.map(model => ({
      provider,
      id: model.id,
      name: model.name,
      ...typeof model.contextWindow === 'number' && model.contextWindow > 0
        ? { description: `Context window: ${model.contextWindow}` }
        : {},
    }))
  }

  async resolveModel(provider, model) {
    const models = await this.fetchModels()
    const found = models.find(entry => entry.id === model)
    return {
      provider,
      id: model,
      name: found?.name ?? model,
      ...typeof found?.contextWindow === 'number' && found.contextWindow > 0
        ? { context: { contextWindow: found.contextWindow } }
        : {},
    }
  }

  async fetchModels() {
    if (Array.isArray(this.modelCache) && this.modelCache.length > 0) return this.modelCache
    try {
      const client = await this.ensureClient()
      const models = await client.listModels()
      this.modelCache = models
        .map(model => ({
          id: model.id,
          name: model.name,
          contextWindow: model.capabilities?.limits?.max_context_window_tokens,
        }))
      if (this.modelCache.length > 0) return this.modelCache
    } catch {
      // fall through to static model fallback
    }
    this.modelCache = DEFAULT_MODELS.map(id => ({ id, name: id }))
    return this.modelCache
  }

  async *stream(options) {
    let session
    try {
      const client = await this.ensureClient()
      session = await client.createSession({
        model: options.model,
        onPermissionRequest: approveAll,
        availableTools: [],
        workingDirectory: this.options.workingDirectory,
      })
      const prompt = buildPrompt(options)
      const response = await session.sendAndWait(
        { prompt: prompt.length > 0 ? prompt : 'Continue.' },
        this.options.responseTimeoutMs,
      )
      const content = response?.data?.content ?? ''
      yield { type: 'block-start', index: 0, blockType: 'text' }
      if (content.length > 0) yield { type: 'text-delta', index: 0, text: content }
      yield { type: 'block-end', index: 0, block: { type: 'text', text: content } }
      yield { type: 'finish', reason: { kind: 'stop' } }
    } catch (error) {
      yield { type: 'finish', reason: toStopReason(error, options.signal) }
    } finally {
      if (session !== undefined) await session.disconnect()
    }
  }
}

export const name = 'llm-ghc-local'
export const inject = ['llm']

export function apply(ctx, config = {}) {
  const provider = typeof config.provider === 'string' && config.provider.length > 0 ? config.provider : DEFAULT_PROVIDER
  const adapter = new GhcLocalAdapter({
    displayName: config.displayName,
    workingDirectory: config.workingDirectory,
    baseDirectory: config.baseDirectory,
    responseTimeoutMs: typeof config.responseTimeoutMs === 'number' ? config.responseTimeoutMs : undefined,
  })
  ctx.llm.registerConfigurableProviders([
    {
      provider,
      displayName: adapter.providerInfo(provider).name,
      settingsNs: ctx.fiber.entry?.options.id ?? name,
      settingsPath: [],
      declared: true,
    },
  ])
  ctx.llm.registerAdapter([provider], adapter)
}
