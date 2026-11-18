# @renmin/dsh-llm-ghc-local

DSH LLM adapter plugin that routes main-agent model calls to the local GitHub Copilot runtime via `@github/copilot-sdk`.

## Route

- Provider route id: `ghc-local`
- Default display name: `GitHub Copilot Local`

## Config

```yaml
- id: llm-ghc-local
  name: '@renmin/dsh-llm-ghc-local'
  config:
    provider: ghc-local
    displayName: GitHub Copilot Local
    workingDirectory: C:\Users\minren\Documents\Microsoft Scout\deepseek-harness-src
```

Supported config fields:

- `provider?: string` (default `ghc-local`)
- `displayName?: string`
- `workingDirectory?: string`
- `baseDirectory?: string`
- `responseTimeoutMs?: number`

## Development

```bash
npm install
npm test
```
