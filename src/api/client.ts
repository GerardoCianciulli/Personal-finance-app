import sampleData from '../../data.json'
import { buildDb } from '../../scripts/db-seed.mjs'
import type { Balance, CollectionItem, CollectionName, Database, SampleData } from '../types'

/**
 * Data access goes through one of two stores with the same interface:
 *  - ServerStore talks to json-server with Fetch (used in development: `npm run dev`)
 *  - BrowserStore keeps the data in localStorage, seeded from data.json, so the deployed
 *    GitHub Pages site (where json-server cannot run) is fully functional too.
 */
export interface Store {
  readonly kind: 'server' | 'browser'
  getDb(): Promise<Database>
  create<K extends CollectionName>(name: K, item: Omit<CollectionItem<K>, 'id'>): Promise<CollectionItem<K>>
  update<K extends CollectionName>(name: K, id: number, patch: Partial<CollectionItem<K>>): Promise<CollectionItem<K>>
  remove(name: CollectionName, id: number): Promise<void>
  updateBalance(balance: Balance): Promise<Balance>
}

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) throw new Error(`Request to ${path} failed with status ${response.status}`)
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

const serverStore: Store = {
  kind: 'server',
  getDb: () => request<Database>('/db'),
  create: (name, item) => request(`/${name}`, { method: 'POST', body: JSON.stringify(item) }),
  update: (name, id, patch) => request(`/${name}/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: async (name, id) => {
    await request(`/${name}/${id}`, { method: 'DELETE' })
  },
  updateBalance: (balance) => request<Balance>('/balance', { method: 'PUT', body: JSON.stringify(balance) }),
}

const STORAGE_KEY = 'personal-finance-app:db'

function createBrowserStore(): Store {
  const read = (): Database => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved) as Database
      } catch {
        // fall through and reseed
      }
    }
    const seeded = buildDb(sampleData as SampleData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
  const write = (db: Database) => localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  const collection = <K extends CollectionName>(db: Database, name: K) => db[name] as CollectionItem<K>[]

  return {
    kind: 'browser',
    getDb: async () => structuredClone(read()),
    create: async (name, item) => {
      const db = read()
      const list = collection(db, name)
      const id = list.reduce((max, entry) => Math.max(max, entry.id), 0) + 1
      const created = { ...item, id } as CollectionItem<typeof name>
      list.push(created)
      write(db)
      return created
    },
    update: async (name, id, patch) => {
      const db = read()
      const list = collection(db, name)
      const index = list.findIndex((entry) => entry.id === id)
      if (index === -1) throw new Error(`${name} #${id} not found`)
      list[index] = { ...list[index], ...patch, id }
      write(db)
      return list[index]
    },
    remove: async (name, id) => {
      const db = read()
      const list = collection(db, name)
      const index = list.findIndex((entry) => entry.id === id)
      if (index !== -1) list.splice(index, 1)
      write(db)
    },
    updateBalance: async (balance) => {
      const db = read()
      db.balance = balance
      write(db)
      return balance
    },
  }
}

async function isServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/balance`, { signal: AbortSignal.timeout(1500) })
    return response.ok
  } catch {
    return false
  }
}

let storePromise: Promise<Store> | null = null

/** Uses json-server when it is reachable (dev or VITE_API_URL), otherwise the browser store */
export function getStore(): Promise<Store> {
  storePromise ??= (async () => {
    const tryServer = import.meta.env.DEV || Boolean(import.meta.env.VITE_API_URL)
    if (tryServer && (await isServerAvailable())) return serverStore
    if (tryServer) console.info('json-server is not reachable: using data stored in this browser instead.')
    return createBrowserStore()
  })()
  return storePromise
}
