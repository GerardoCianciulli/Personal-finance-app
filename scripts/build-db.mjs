// Creates the json-server database (db.json) from the provided sample data (data.json).
//   npm run seed          -> (re)creates db.json
//   --if-missing          -> keeps an existing db.json (used by `npm run server`)
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDb } from './db-seed.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = resolve(root, 'db.json')

if (process.argv.includes('--if-missing') && existsSync(target)) {
  console.log('db.json already exists, keeping it (run `npm run seed` to reset).')
} else {
  const data = JSON.parse(readFileSync(resolve(root, 'data.json'), 'utf8'))
  writeFileSync(target, JSON.stringify(buildDb(data), null, 2) + '\n')
  console.log('db.json created from data.json')
}
