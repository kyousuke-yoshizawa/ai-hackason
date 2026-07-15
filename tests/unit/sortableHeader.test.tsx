import { render, screen, fireEvent } from '@testing-library/react'
import { SortableHeader } from '../../src/components/SortableHeader'

describe('SortableHeader', () => {
  it('ラベルを表示し、クリックでonSortをsortKey付きで呼び出す', () => {
    const onSort = jest.fn()
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              label="名前"
              sortKey="name"
              currentSortKey="category"
              currentSortDir="asc"
              onSort={onSort}
            />
          </tr>
        </thead>
      </table>
    )

    fireEvent.click(screen.getByRole('button', { name: /名前/ }))
    expect(onSort).toHaveBeenCalledWith('name')
  })

  it('アクティブな列は昇順で▲、降順で▼を表示する', () => {
    const { rerender } = render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              label="名前"
              sortKey="name"
              currentSortKey="name"
              currentSortDir="asc"
              onSort={jest.fn()}
            />
          </tr>
        </thead>
      </table>
    )
    expect(screen.getByRole('button', { name: /名前/ }).textContent).toContain('▲')

    rerender(
      <table>
        <thead>
          <tr>
            <SortableHeader
              label="名前"
              sortKey="name"
              currentSortKey="name"
              currentSortDir="desc"
              onSort={jest.fn()}
            />
          </tr>
        </thead>
      </table>
    )
    expect(screen.getByRole('button', { name: /名前/ }).textContent).toContain('▼')
  })

  it('アクティブでない列には矢印を表示しない', () => {
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              label="名前"
              sortKey="name"
              currentSortKey="category"
              currentSortDir="asc"
              onSort={jest.fn()}
            />
          </tr>
        </thead>
      </table>
    )
    expect(screen.getByRole('button', { name: /名前/ }).textContent).toBe('名前')
  })
})
