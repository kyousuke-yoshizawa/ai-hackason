type Row = Record<string, unknown>

type FilterOp = 'eq' | 'lte' | 'is'

interface Filter {
  op: FilterOp
  column: string
  value: unknown
}

class FakeTable {
  rows: Row[] = []
  private nextId = 1

  generateId(): string {
    return `fake-id-${this.nextId++}`
  }
}

class FakeQueryBuilder implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private filters: Filter[] = []
  private insertObj: Row | null = null
  private updateObj: Row | null = null
  private orderColumn: string | null = null
  private orderAscending = true
  private limitCount: number | undefined
  private singleMode = false

  constructor(private table: FakeTable) {}

  insert(obj: Row): this {
    this.op = 'insert'
    this.insertObj = obj
    return this
  }

  upsert(obj: Row): this {
    this.op = 'upsert'
    this.insertObj = obj
    return this
  }

  select(): this {
    return this
  }

  update(obj: Row): this {
    this.op = 'update'
    this.updateObj = obj
    return this
  }

  delete(): this {
    this.op = 'delete'
    return this
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ op: 'eq', column, value })
    return this
  }

  lte(column: string, value: unknown): this {
    this.filters.push({ op: 'lte', column, value })
    return this
  }

  is(column: string, value: unknown): this {
    this.filters.push({ op: 'is', column, value })
    return this
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this.orderColumn = column
    this.orderAscending = opts?.ascending !== false
    return this
  }

  limit(count: number): this {
    this.limitCount = count
    return this
  }

  single(): this {
    this.singleMode = true
    return this
  }

  private matches(row: Row): boolean {
    return this.filters.every((filter) => {
      const rowValue = row[filter.column] as string | number
      const filterValue = filter.value as string | number
      if (filter.op === 'eq') return rowValue === filterValue
      if (filter.op === 'lte') return rowValue <= filterValue
      if (filter.op === 'is') return (rowValue ?? null) === filterValue
      return true
    })
  }

  private execute(): { data: unknown; error: { message: string } | null } {
    if (this.op === 'insert' && this.insertObj) {
      const now = new Date().toISOString()
      const row: Row = { id: this.table.generateId(), created_at: now, ...this.insertObj }
      this.table.rows.push(row)
      return { data: this.singleMode ? row : [row], error: null }
    }

    if (this.op === 'update') {
      const matched = this.table.rows.filter((row) => this.matches(row))
      matched.forEach((row) => Object.assign(row, this.updateObj))
      return { data: this.singleMode ? matched[0] ?? null : matched, error: null }
    }

    if (this.op === 'delete') {
      const matched = this.table.rows.filter((row) => this.matches(row))
      this.table.rows = this.table.rows.filter((row) => !this.matches(row))
      return { data: matched, error: null }
    }

    if (this.op === 'upsert' && this.insertObj) {
      const matchKey = 'store_id' in this.insertObj ? 'store_id' : 'id'
      const existing = this.table.rows.find((row) => row[matchKey] === this.insertObj![matchKey])
      if (existing) {
        Object.assign(existing, this.insertObj)
        return { data: this.singleMode ? existing : [existing], error: null }
      }
      const now = new Date().toISOString()
      const row: Row = { id: this.table.generateId(), created_at: now, ...this.insertObj }
      this.table.rows.push(row)
      return { data: this.singleMode ? row : [row], error: null }
    }

    let rows = this.table.rows.filter((row) => this.matches(row))
    if (this.orderColumn) {
      const column = this.orderColumn
      rows = [...rows].sort((a, b) => {
        const av = a[column] as string
        const bv = b[column] as string
        if (av === bv) return 0
        const cmp = av > bv ? 1 : -1
        return this.orderAscending ? cmp : -cmp
      })
    }
    if (this.limitCount !== undefined) {
      rows = rows.slice(0, this.limitCount)
    }

    if (this.singleMode) {
      return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'not found' } }
    }
    return { data: rows, error: null }
  }

  then<TResult1, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }
}

class FakeStorageBucket {
  uploads: { path: string; body: unknown; contentType?: string }[] = []
  removed: string[] = []

  constructor(private bucketName: string) {}

  async upload(path: string, body: unknown, options?: { contentType?: string }) {
    this.uploads.push({ path, body, contentType: options?.contentType })
    return { data: { path }, error: null }
  }

  async remove(paths: string[]) {
    this.removed.push(...paths)
    return { data: paths, error: null }
  }

  getPublicUrl(path: string) {
    return {
      data: {
        publicUrl: `https://fake.supabase.co/storage/v1/object/public/${this.bucketName}/${path}`,
      },
    }
  }
}

class FakeStorage {
  private buckets = new Map<string, FakeStorageBucket>()

  from(bucket: string): FakeStorageBucket {
    if (!this.buckets.has(bucket)) {
      this.buckets.set(bucket, new FakeStorageBucket(bucket))
    }
    return this.buckets.get(bucket)!
  }
}

export class FakeSupabaseClient {
  private tables = new Map<string, FakeTable>()
  storage = new FakeStorage()

  from(name: string): FakeQueryBuilder {
    if (!this.tables.has(name)) {
      this.tables.set(name, new FakeTable())
    }
    return new FakeQueryBuilder(this.tables.get(name)!)
  }

  seed(name: string, rows: Row[]): void {
    const table = new FakeTable()
    table.rows = rows.map((row) => ({ ...row }))
    this.tables.set(name, table)
  }

  reset(): void {
    this.tables.clear()
    this.storage = new FakeStorage()
  }

  getRows(name: string): Row[] {
    return this.tables.get(name)?.rows ?? []
  }
}

export function createFakeSupabaseClient(): FakeSupabaseClient {
  return new FakeSupabaseClient()
}
