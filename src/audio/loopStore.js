import { openDB } from 'idb'

const DB_NAME = 'song-starter'
const DB_VER  = 1
const STORE   = 'loops'

let _db = null
async function getDb() {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VER, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE))
        d.createObjectStore(STORE, { keyPath: 'id' })
    },
  })
  return _db
}

export async function loadLoops() {
  const db = await getDb()
  const all = await db.getAll(STORE)
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function persistLoop(loop) {
  await (await getDb()).put(STORE, loop)
}

export async function removeLoop(id) {
  await (await getDb()).delete(STORE, id)
}

export async function updateLoop(id, changes) {
  const db = await getDb()
  const loop = await db.get(STORE, id)
  if (loop) await db.put(STORE, { ...loop, ...changes })
}
