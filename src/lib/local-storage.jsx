import { createContext, useContext, useMemo } from 'react'

const PROJECTS_KEY = 'codecraft.projects.v1'
const FILES_KEY = 'codecraft.project-files.v1'

function readRows(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function writeRows(key, rows) {
  window.localStorage.setItem(key, JSON.stringify(rows))
}

function createId() {
  return crypto.randomUUID()
}

class LocalQuery {
  constructor(table) {
    this.table = table
    this.operation = 'select'
    this.payload = null
    this.filters = []
    this.ordering = null
  }

  select() {
    this.operation = this.operation === 'insert' || this.operation === 'update' ? this.operation : 'select'
    return this
  }

  insert(payload) {
    this.operation = 'insert'
    this.payload = payload
    return this
  }

  update(payload) {
    this.operation = 'update'
    this.payload = payload
    return this
  }

  upsert(payload, options = {}) {
    this.operation = 'upsert'
    this.payload = payload
    this.upsertOptions = options
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(field, value) {
    this.filters.push((row) => row[field] === value)
    return this
  }

  order(field, options = {}) {
    this.ordering = { field, ascending: options.ascending !== false }
    return this
  }

  async execute() {
    if (typeof window === 'undefined') return { data: [], error: new Error('Device storage is unavailable.') }

    const key = this.table === 'projects' ? PROJECTS_KEY : FILES_KEY
    const rows = readRows(key)
    const matches = (row) => this.filters.every((filter) => filter(row))
    const now = new Date().toISOString()

    if (this.operation === 'insert') {
      const values = Array.isArray(this.payload) ? this.payload : [this.payload]
      const created = values.map((value) => ({
        ...value,
        id: value.id || createId(),
        created_at: value.created_at || now,
        updated_at: value.updated_at || now,
      }))
      writeRows(key, [...rows, ...created])
      return { data: created, error: null }
    }

    if (this.operation === 'upsert') {
      const values = Array.isArray(this.payload) ? this.payload : [this.payload]
      const conflictField = this.upsertOptions?.onConflict || 'id'
      const merged = [...rows]
      values.forEach((value) => {
        const rowIndex = merged.findIndex((row) => row[conflictField] !== undefined && row[conflictField] === value[conflictField])
        if (rowIndex >= 0) merged[rowIndex] = { ...merged[rowIndex], ...value, updated_at: now }
        else merged.push({ ...value, id: value.id || createId(), created_at: value.created_at || now, updated_at: value.updated_at || now })
      })
      writeRows(key, merged)
      return { data: merged.filter((row) => matches(row)), error: null }
    }

    if (this.operation === 'update') {
      const updated = rows.map((row) => matches(row) ? { ...row, ...this.payload, updated_at: now } : row)
      writeRows(key, updated)
      return { data: updated.filter(matches), error: null }
    }

    if (this.operation === 'delete') {
      const removed = rows.filter(matches)
      writeRows(key, rows.filter((row) => !matches(row)))
      if (this.table === 'projects' && removed.length) {
        const removedIds = new Set(removed.map((project) => project.id))
        writeRows(FILES_KEY, readRows(FILES_KEY).filter((file) => !removedIds.has(file.project_id)))
      }
      return { data: removed, error: null }
    }

    let result = rows.filter(matches)
    if (this.ordering) {
      const direction = this.ordering.ascending ? 1 : -1
      result = result.sort((a, b) => String(a[this.ordering.field]).localeCompare(String(b[this.ordering.field])) * direction)
    }
    return { data: result, error: null }
  }

  async single() {
    const result = await this.execute()
    return { data: result.data?.[0] || null, error: result.error || (!result.data?.[0] ? new Error('No matching device record.') : null) }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject)
  }
}

const LocalStorageContext = createContext(null)

export const isLocalStorageConfigured = typeof window !== 'undefined'

export function LocalStorageProvider({ children }) {
  const client = useMemo(() => ({
    from: (table) => new LocalQuery(table),
  }), [])
  return <LocalStorageContext.Provider value={client}>{children}</LocalStorageContext.Provider>
}

export function useLocalStorage() {
  return useContext(LocalStorageContext)
}
