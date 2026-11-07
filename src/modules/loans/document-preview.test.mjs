import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const storage = new Map()
const session = new Map()
const browserGlobals = ['window', 'document', 'localStorage', 'sessionStorage']
const originalGlobals = new Map(browserGlobals.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
const tokenKey = 'titanium.auth_token'
const createStorage = (values) => ({
  getItem: (key) => values.get(key) ?? null,
  removeItem: (key) => values.delete(key),
})
let server
let api
let http

before(async () => {
  for (const [name, value] of Object.entries({
    window: { location: { origin: 'https://app.example.test' } },
    localStorage: createStorage(storage),
    sessionStorage: createStorage(session),
  })) {
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  }
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('../../../', import.meta.url)),
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    resolve: { alias: { '@': fileURLToPath(new URL('../../', import.meta.url)) } },
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
    logLevel: 'error',
  })
  api = (await server.ssrLoadModule('/src/modules/loans/api.ts')).loansApi
  http = await server.ssrLoadModule('/src/core/api/http.ts')
})

afterEach(() => {
  storage.clear()
  session.clear()
  http.onUnauthorized(() => {})
})

after(async () => {
  await server?.close()
  for (const [name, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  }
})

test('PDF previews use the private loan route and the signed-in bearer token', async (context) => {
  storage.set(tokenKey, 'test-access-token')
  const controller = new AbortController()
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://app.example.test/api/v1/loans/12/documents/7')
    assert.equal(options.headers.Authorization, 'Bearer test-access-token')
    assert.equal(options.signal, controller.signal)
    return new Response('%PDF-1.7\nexample', { headers: { 'Content-Type': 'application/pdf' } })
  })

  const file = await api.documentFile(12, 7, controller.signal)

  assert.equal(file.type, 'application/pdf')
  assert.equal(await file.text(), '%PDF-1.7\nexample')
})

test('image previews preserve the image MIME type and contents', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response(new Uint8Array([137, 80, 78, 71]), {
    headers: { 'Content-Type': 'image/png' },
  }))

  const file = await api.documentFile(12, 8)

  assert.equal(file.type, 'image/png')
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), new Uint8Array([137, 80, 78, 71]))
})

test('an expired preview session clears stored tokens and triggers sign-in handling', async (context) => {
  storage.set(tokenKey, 'expired-access-token')
  session.set(tokenKey, 'expired-session-token')
  let unauthorized = false
  http.onUnauthorized(() => { unauthorized = true })
  context.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Unauthenticated.' }, { status: 401 }))

  await assert.rejects(() => api.documentFile(12, 7), (error) => error instanceof http.ApiError && error.status === 401 && error.message === 'Unauthenticated.')

  assert.equal(storage.has(tokenKey), false)
  assert.equal(session.has(tokenKey), false)
  assert.equal(unauthorized, true)
})

test('a missing document reports the API error without discarding a valid session', async (context) => {
  storage.set(tokenKey, 'valid-access-token')
  context.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Document not found.' }, { status: 404 }))

  await assert.rejects(() => api.documentFile(12, 99), (error) => error.status === 404 && error.message === 'Document not found.')

  assert.equal(storage.get(tokenKey), 'valid-access-token')
})

test('closing a preview can abort the private file request', async (context) => {
  const controller = new AbortController()
  context.mock.method(globalThis, 'fetch', (_, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  }))
  const pending = api.documentFile(12, 7, controller.signal)

  controller.abort()

  await assert.rejects(pending, { name: 'AbortError' })
})

test('the existing download action keeps the original filename and releases its file URL', async (context) => {
  const link = { href: '', download: '', click: context.mock.fn() }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => link } })
  context.mock.method(globalThis, 'fetch', async () => new Response('example', { headers: { 'Content-Type': 'application/pdf' } }))
  context.mock.method(URL, 'createObjectURL', () => 'blob:test-download')
  const revoke = context.mock.method(URL, 'revokeObjectURL', () => {})

  await api.downloadDocument(12, 7, 'signed-agreement.pdf')

  assert.equal(link.download, 'signed-agreement.pdf')
  assert.equal(link.href, 'blob:test-download')
  assert.equal(link.click.mock.callCount(), 1)
  assert.deepEqual(revoke.mock.calls[0].arguments, ['blob:test-download'])
})
