import sampleData from '../../data.json'
import { buildUserData, migrate, nextId, USER_COLLECTIONS } from '../../scripts/db-seed.mjs'
import type { Database, SampleData, User, UserCollectionName, UserData } from '../types'

/**
 * Data access, with two backends behind the same interfaces:
 *  - json-server through Fetch (development: `npm run dev`)
 *  - localStorage, so the deployed GitHub Pages site (where json-server cannot run) works too
 *
 * Accounts are shared by everyone (`getAccounts`), while each account's finances live in
 * their own store (`getStore(user.id)`): budgets, transactions, pots, recurring bills, incomes
 * and the balance. A store only ever reads or writes the data of the account it was opened
 * for, and the first time an account loads, its store is seeded with a fresh copy of data.json.
 */

type Item<K extends UserCollectionName> = UserData[K][number]
/** What a page sends when it creates a record: the store adds the id and the owner */
export type NewItem<K extends UserCollectionName> = Omit<Item<K>, 'id' | 'userId'>

/** The signed-in account's own data */
export interface UserStore {
  readonly userId: number
  /** Loads the account's data; the first time, creates it as a copy of data.json */
  load(): Promise<UserData>
  create<K extends UserCollectionName>(name: K, item: NewItem<K>): Promise<Item<K>>
  update<K extends UserCollectionName>(name: K, id: number, patch: Partial<NewItem<K>>): Promise<Item<K>>
  remove(name: UserCollectionName, id: number): Promise<void>
}

/** Accounts, shared by every user */
export interface AccountStore {
  list(): Promise<User[]>
  create(user: Omit<User, 'id'>): Promise<User>
}

/** Balances last: an account whose balance exists has a complete copy of the sample data */
const SEED_ORDER: UserCollectionName[] = [...USER_COLLECTIONS.filter((n) => n !== 'balances'), 'balances']

/** Shares one in-flight load per account, so two simultaneous loads can't seed the data twice */
const pendingLoads = new Map<string, Promise<UserData>>()
function loadOnce(key: string, load: () => Promise<UserData>): Promise<UserData> {
  let promise = pendingLoads.get(key)
  if (!promise) {
    promise = load().finally(() => pendingLoads.delete(key))
    pendingLoads.set(key, promise)
  }
  return promise
}

/* -------------------------------------------------------------------------- */
/* json-server: every row carries a userId, and every request filters by it   */
/* -------------------------------------------------------------------------- */

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) throw new Error(`Request to ${path} failed with status ${response.status}`)
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

const serverAccounts: AccountStore = {
  list: () => request<User[]>('/users'),
  create: (user) => request<User>('/users', { method: 'POST', body: JSON.stringify(user) }),
}

function serverStore(userId: number): UserStore {
  const fetchAll = async (): Promise<UserData> => {
    const entries = await Promise.all(
      USER_COLLECTIONS.map(async (name) => [name, await request<unknown[]>(`/${name}?userId=${userId}`)] as const),
    )
    return Object.fromEntries(entries) as unknown as UserData
  }

  /** Edits and deletes only go ahead for a row this account owns */
  const assertOwned = async (name: UserCollectionName, id: number) => {
    const rows = await request<unknown[]>(`/${name}?id=${id}&userId=${userId}`)
    if (!rows.length) throw new Error(`${name} #${id} does not belong to this account`)
  }

  return {
    userId,
    load: () =>
      loadOnce(`server:${userId}`, async () => {
        const data = await fetchAll()
        if (data.balances.length) return data
        // No balance yet: the copy of the sample data was never completed, so remove anything
        // an interrupted attempt left behind before creating it, one request at a time
        for (const name of SEED_ORDER) {
          for (const record of data[name]) await request(`/${name}/${record.id}`, { method: 'DELETE' })
        }
        const seed = buildUserData(sampleData as SampleData, userId)
        for (const name of SEED_ORDER) {
          for (const record of seed[name]) await request(`/${name}`, { method: 'POST', body: JSON.stringify(record) })
        }
        return fetchAll()
      }),
    create: (name, item) => request(`/${name}`, { method: 'POST', body: JSON.stringify({ ...item, userId }) }),
    update: async (name, id, patch) => {
      await assertOwned(name, id)
      return request(`/${name}/${id}`, { method: 'PATCH', body: JSON.stringify({ ...patch, userId }) })
    },
    remove: async (name, id) => {
      await assertOwned(name, id)
      await request(`/${name}/${id}`, { method: 'DELETE' })
    },
  }
}

/* -------------------------------------------------------------------------- */
/* localStorage: one shared key for accounts, one key per account for its data */
/* -------------------------------------------------------------------------- */

const USERS_KEY = 'personal-finance-app:users'
const dataKey = (userId: number) => `personal-finance-app:data:${userId}`
/** Single key used before accounts had their own data */
const LEGACY_KEY = 'personal-finance-app:db'

function readJson<T>(key: string): T | null {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : null
  } catch {
    return null
  }
}
const writeJson = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value))

/**
 * Earlier versions kept everything under one key, shared by every account. Accounts move to the
 * shared users key; the shared data goes to the oldest account (other accounts get their own
 * copy of data.json when they next sign in).
 */
function upgradeLegacyStorage() {
  const legacy = readJson<Database>(LEGACY_KEY)
  if (!legacy) return
  const db = migrate(legacy)
  const users = readJson<User[]>(USERS_KEY) ?? []
  for (const user of db.users) if (!users.some((u) => u.id === user.id)) users.push(user)
  writeJson(USERS_KEY, users)
  for (const user of db.users) {
    if (localStorage.getItem(dataKey(user.id))) continue
    const own = Object.fromEntries(
      USER_COLLECTIONS.map((name) => [name, db[name].filter((record) => record.userId === user.id)]),
    ) as unknown as UserData
    if (own.balances.length) writeJson(dataKey(user.id), own)
  }
  localStorage.removeItem(LEGACY_KEY)
}

const browserAccounts: AccountStore = {
  list: async () => {
    upgradeLegacyStorage()
    return readJson<User[]>(USERS_KEY) ?? []
  },
  create: async (user) => {
    const users = await browserAccounts.list()
    const created = { ...user, id: nextId(users) }
    writeJson(USERS_KEY, [...users, created])
    return created
  },
}

function browserStore(userId: number): UserStore {
  const key = dataKey(userId)
  const read = () => readJson<UserData>(key)
  const write = (data: UserData) => writeJson(key, data)
  const list = <K extends UserCollectionName>(data: UserData, name: K) => data[name] as Item<K>[]

  /** Reads the account's data, creating it from data.json the first time */
  const readOrSeed = (): UserData => {
    upgradeLegacyStorage()
    const saved = read()
    if (saved?.balances?.length) return saved
    const seed = buildUserData(sampleData as SampleData, userId)
    const fresh = Object.fromEntries(
      SEED_ORDER.map((name) => [name, seed[name].map((record, index) => ({ ...record, id: index + 1 }))]),
    ) as unknown as UserData
    write(fresh)
    return fresh
  }

  return {
    userId,
    load: () => loadOnce(`browser:${userId}`, async () => structuredClone(readOrSeed())),
    create: async (name, item) => {
      const data = readOrSeed()
      const items = list(data, name)
      const created = { ...item, id: nextId(items), userId } as Item<typeof name>
      items.push(created)
      write(data)
      return created
    },
    update: async (name, id, patch) => {
      const data = readOrSeed()
      const items = list(data, name)
      const index = items.findIndex((entry) => entry.id === id)
      if (index === -1) throw new Error(`${name} #${id} not found`)
      items[index] = { ...items[index], ...patch, id, userId }
      write(data)
      return items[index]
    },
    remove: async (name, id) => {
      const data = readOrSeed()
      const items = list(data, name)
      const index = items.findIndex((entry) => entry.id === id)
      if (index !== -1) items.splice(index, 1)
      write(data)
    },
  }
}

/* -------------------------------------------------------------------------- */
/* Backend selection                                                           */
/* -------------------------------------------------------------------------- */

let backendPromise: Promise<'server' | 'browser'> | null = null

/** json-server when it is reachable (dev or VITE_API_URL), otherwise localStorage */
function getBackend(): Promise<'server' | 'browser'> {
  backendPromise ??= (async () => {
    const tryServer = import.meta.env.DEV || Boolean(import.meta.env.VITE_API_URL)
    if (!tryServer) return 'browser'
    try {
      const response = await fetch(`${API_URL}/users`, { signal: AbortSignal.timeout(1500) })
      if (response.ok) return 'server'
    } catch {
      // not reachable
    }
    console.info('json-server is not reachable: using data stored in this browser instead.')
    return 'browser'
  })()
  return backendPromise
}

/** Accounts, shared by every user */
export async function getAccounts(): Promise<AccountStore> {
  return (await getBackend()) === 'server' ? serverAccounts : browserAccounts
}

/** The store of one account: it only reads and writes that account's own data */
export async function getStore(userId: number): Promise<UserStore> {
  return (await getBackend()) === 'server' ? serverStore(userId) : browserStore(userId)
}
