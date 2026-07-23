import { render, screen } from '@testing-library/react'
import { ScoreBadge } from '../../src/components/ScoreBadge'

describe('ScoreBadge', () => {
  it('0.8以上は緑系のバーになる', () => {
    render(<ScoreBadge score={0.85} />)
    const bar = screen.getByTestId('score-bar')
    expect(bar.className).toContain('bg-leaf-500')
    expect(screen.getByText('おすすめ度 85%')).toBeTruthy()
  })

  it('0.6〜0.8は黄系のバーになる', () => {
    render(<ScoreBadge score={0.65} />)
    const bar = screen.getByTestId('score-bar')
    expect(bar.className).toContain('bg-yellow-400')
  })

  it('0.6未満はグレー系のバーになる', () => {
    render(<ScoreBadge score={0.3} />)
    const bar = screen.getByTestId('score-bar')
    expect(bar.className).toContain('bg-wood-300')
  })

  it('0や1の端値でも壊れない', () => {
    render(<ScoreBadge score={0} />)
    expect(screen.getByText('おすすめ度 0%')).toBeTruthy()

    render(<ScoreBadge score={1} />)
    expect(screen.getByText('おすすめ度 100%')).toBeTruthy()
  })

  it('範囲外の値もクランプされる', () => {
    render(<ScoreBadge score={1.5} />)
    expect(screen.getByText('おすすめ度 100%')).toBeTruthy()
  })
})
