type Row = Record<string, unknown>

type FilterOp = 'eq' | 'lte'

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
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
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
      return true
    })
  }

  private execute(): { data: unknown; error: { message: string } | null } {
    if (this.op === 'insert' && this.insertObj) {
      const now = new Date().toISOString()
      const row: Row = {
        id: this.table.generateId(),
        created_at: now,
        updated_at: now,
        retry_count: 0,
        max_retries: 3,
        last_error: null,
        sent_at: null,
        recipient_name: null,
        store_id: null,
        status: 'pending',
        ...this.insertObj,
      }
      this.table.rows.push(row)
      return { data: row, error: null }
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

export class FakeSupabaseClient {
  private tables = new Map<string, FakeTable>()

  from(name: string): FakeQueryBuilder {
    if (!this.tables.has(name)) {
      this.tables.set(name, new FakeTable())
    }
    return new FakeQueryBuilder(this.tables.get(name)!)
  }

  reset(): void {
    this.tables.clear()
  }

  getRows(name: string): Row[] {
    return this.tables.get(name)?.rows ?? []
  }
}

export function createFakeSupabaseClient(): FakeSupabaseClient {
  return new FakeSupabaseClient()
}
