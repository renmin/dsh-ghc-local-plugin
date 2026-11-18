# @renmin/dsh-llm-ghc-local

Installable DSH bundle plugin that adds a `ghc-local` LLM provider route and bridges chat requests to local GitHub Copilot via `@github/copilot-sdk`.

## What gets installed

- Bundle patch inserts plugin row `llm-ghc-local`
- Provider route id: `ghc-local`
- Provider display name: `GitHub Copilot Local`

## Install (distributable)

1. Publish this package (npm or GitHub package registry), or pack it:
   - `npm pack` (creates `renmin-dsh-llm-ghc-local-<version>.tgz`)
2. In DSH **Plugins** panel, add plugin by package name (published) or local `.tgz`.
3. Restart DSH if prompted.
4. In chat model selector, choose provider `ghc-local` and pick a model.

## Optional config override

```yaml
- id: llm-ghc-local
  name: '@renmin/dsh-llm-ghc-local'
  config:
    provider: ghc-local
    displayName: GitHub Copilot Local
    workingDirectory: C:\path\to\project
    baseDirectory: C:\path\to\base
    responseTimeoutMs: 120000
```

Config fields:

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
