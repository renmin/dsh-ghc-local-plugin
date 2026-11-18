import test from 'node:test'
import assert from 'node:assert/strict'

import { apply } from '../index.js'

test('apply registers ghc-local provider and adapter', () => {
  let directoryEntries
  let adapterRoutes
  const ctx = {
    llm: {
      registerConfigurableProviders(entries) {
        directoryEntries = entries
      },
      registerAdapter(routes) {
        adapterRoutes = routes
      },
    },
    fiber: { entry: { options: { id: 'llm-ghc-local' } } },
  }

  apply(ctx, {})

  assert.ok(Array.isArray(directoryEntries))
  assert.equal(directoryEntries.length, 1)
  assert.equal(directoryEntries[0].provider, 'ghc-local')
  assert.deepEqual(adapterRoutes, ['ghc-local'])
})
