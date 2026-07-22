type Row = Record<string, unknown>

type FilterOp = 'eq' | 'lte' | 'is' | 'in'

interface Filter {
  op: FilterOp
  column: string
  value: unknown
}

class FakeTable {
  rows: Row[] = []
  uniqueColumns: string[][] = []
  private nextId = 1

  generateId(): string {
    return `fake-id-${this.nextId++}`
  }
}

type FakeError = { message: string; code?: string }

class FakeQueryBuilder implements PromiseLike<{ data: unknown; error: FakeError | null; count?: number }> {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private filters: Filter[] = []
  private insertObj: Row | Row[] | null = null
  private upsertObj: Row | null = null
  private updateObj: Row | null = null
  private orderColumn: string | null = null
  private orderAscending = true
  private limitCount: number | undefined
  private singleMode = false
  private maybeMode = false
  private countMode = false
  private headMode = false

  constructor(private table: FakeTable) {}

  insert(obj: Row | Row[]): this {
    this.op = 'insert'
    this.insertObj = obj
    return this
  }

  upsert(obj: Row): this {
    this.op = 'upsert'
    this.upsertObj = obj
    return this
  }

  select(_columns?: string, options?: { count?: 'exact'; head?: boolean }): this {
    this.countMode = options?.count === 'exact'
    this.headMode = options?.head === true
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

  in(column: string, values: unknown[]): this {
    this.filters.push({ op: 'in', column, value: values })
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

  maybeSingle(): this {
    this.singleMode = true
    this.maybeMode = true
    return this
  }

  private matches(row: Row): boolean {
    return this.filters.every((filter) => {
      const rowValue = row[filter.column] as string | number
      const filterValue = filter.value as string | number
      if (filter.op === 'eq') return rowValue === filterValue
      if (filter.op === 'lte') return rowValue <= filterValue
      if (filter.op === 'is') return (rowValue ?? null) === filterValue
      if (filter.op === 'in') return (filter.value as unknown[]).includes(rowValue)
      return true
    })
  }

  private findUniqueConflict(candidate: Row): boolean {
    return this.table.uniqueColumns.some((columns) =>
      this.table.rows.some((row) => columns.every((column) => row[column] === candidate[column])),
    )
  }

  // 同一バルクinsertバッチ内での重複も一意制約違反として検出する（real Supabaseの挙動を模倣）。
  private hasIntraBatchConflict(candidates: Row[], index: number): boolean {
    const candidate = candidates[index]
    return this.table.uniqueColumns.some((columns) =>
      candidates.some(
        (other, otherIndex) => otherIndex !== index && columns.every((column) => other[column] === candidate[column]),
      ),
    )
  }

  private execute(): { data: unknown; error: FakeError | null; count?: number } {
    if (this.op === 'insert' && this.insertObj) {
      // 単一オブジェクトと配列（bulk insert）の両方に対応。real Supabase の
      // .insert([...]) 相当を模倣し、all-or-nothing（1件でも一意制約違反があれば何も挿入しない）にする。
      const candidates = Array.isArray(this.insertObj) ? this.insertObj : [this.insertObj]
      const hasConflict = candidates.some(
        (candidate, index) => this.findUniqueConflict(candidate) || this.hasIntraBatchConflict(candidates, index),
      )
      if (hasConflict) {
        return {
          data: null,
          error: { message: 'duplicate key value violates unique constraint', code: '23505' },
        }
      }
      const now = new Date().toISOString()
      const rows: Row[] = candidates.map((candidate) => ({
        id: this.table.generateId(),
        created_at: now,
        ...candidate,
      }))
      this.table.rows.push(...rows)
      return { data: this.singleMode ? rows[0] : rows, error: null }
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

    if (this.op === 'upsert' && this.upsertObj) {
      const matchKey = 'store_id' in this.upsertObj ? 'store_id' : 'id'
      const existing = this.table.rows.find((row) => row[matchKey] === this.upsertObj![matchKey])
      if (existing) {
        Object.assign(existing, this.upsertObj)
        return { data: this.singleMode ? existing : [existing], error: null }
      }
      const now = new Date().toISOString()
      const row: Row = { id: this.table.generateId(), created_at: now, ...this.upsertObj }
      this.table.rows.push(row)
      return { data: this.singleMode ? row : [row], error: null }
    }

    let rows = this.table.rows.filter((row) => this.matches(row))
    const matchedCount = rows.length
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

    const count = this.countMode ? matchedCount : undefined

    if (this.headMode) {
      return { data: null, error: null, count }
    }

    if (this.singleMode) {
      if (this.maybeMode) {
        return { data: rows[0] ?? null, error: null, count }
      }
      return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'not found' }, count }
    }
    return { data: rows, error: null, count }
  }

  then<TResult1, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: FakeError | null; count?: number }) => TResult1 | PromiseLike<TResult1>)
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
  // reset() をまたいで保持する制約定義（テーブル自体は reset で作り直されるため分離）
  private uniqueConstraints = new Map<string, string[][]>()
  storage = new FakeStorage()

  private getOrCreateTable(name: string): FakeTable {
    if (!this.tables.has(name)) {
      const table = new FakeTable()
      table.uniqueColumns = this.uniqueConstraints.get(name) ?? []
      this.tables.set(name, table)
    }
    return this.tables.get(name)!
  }

  from(name: string): FakeQueryBuilder {
    return new FakeQueryBuilder(this.getOrCreateTable(name))
  }

  seed(name: string, rows: Row[]): void {
    const table = new FakeTable()
    table.uniqueColumns = this.uniqueConstraints.get(name) ?? []
    table.rows = rows.map((row) => ({ ...row }))
    this.tables.set(name, table)
  }

  // 実DBのUNIQUE制約をシミュレートする（insertで一致する行があると23505エラーを返す）。
  // reset() をまたいで有効（テーブル定義そのものではなくクライアント設定の一部という想定）
  setUniqueConstraint(name: string, columns: string[]): void {
    const existing = this.uniqueConstraints.get(name) ?? []
    const isDuplicate = existing.some(
      (group) => group.length === columns.length && group.every((column, i) => column === columns[i]),
    )
    if (!isDuplicate) {
      existing.push(columns)
    }
    this.uniqueConstraints.set(name, existing)
    if (this.tables.has(name)) {
      this.tables.get(name)!.uniqueColumns = existing
    }
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
