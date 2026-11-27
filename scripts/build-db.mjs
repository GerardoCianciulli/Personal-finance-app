// Creates the json-server database (db.json).
//   npm run seed          -> (re)creates an empty db.json: no accounts yet. Each new account starts
//                            with empty lists (income, transactions, budgets, pots, bills).
//   --if-missing          -> keeps an existing db.json (used by `npm run server`), upgrading data
//                            saved by older versions of the app (see `migrate`)
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { emptyDb, migrate } from './db-seed.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = resolve(root, 'db.json')
const save = (db) => writeFileSync(target, JSON.stringify(db, null, 2) + '\n')

if (process.argv.includes('--if-missing') && existsSync(target)) {
  const db = JSON.parse(readFileSync(target, 'utf8'))
  const upgraded = migrate(db)
  if (upgraded !== db) {
    save(upgraded)
    console.log('db.json upgraded so every account has its own data (existing data kept).')
  } else {
    console.log('db.json already exists, keeping it (run `npm run seed` to reset).')
  }
} else {
  save(emptyDb())
  console.log('db.json reset: no accounts yet. New accounts start with empty lists.')
}
