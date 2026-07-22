import { CROWD_PRESETS } from '../../src/lib/crowdPresets'

// Issue #133: プリセットテンプレート（ランチピーク型/週末カフェ型/夜型/朝夕2山型）の
// cells() が仕様通りの混雑度を返すことを検証する。day: 0=日曜〜6=土曜。
const SUN = 0
const MON = 1
const FRI = 5
const SAT = 6

function findPreset(label: string) {
  const preset = CROWD_PRESETS.find((p) => p.label === label)
  if (!preset) throw new Error(`preset not found: ${label}`)
  return preset
}

describe('CROWD_PRESETS', () => {
  it('exposes exactly the 4 required presets', () => {
    expect(CROWD_PRESETS.map((p) => p.label)).toEqual([
      'ランチピーク型',
      '週末カフェ型',
      '夜型（映画館等）',
      '朝夕2山型',
    ])
  })

  describe('ランチピーク型', () => {
    const preset = findPreset('ランチピーク型')

    it('平日12時は混', () => {
      expect(preset.cells(MON, 12)).toBe('high')
      expect(preset.cells(FRI, 12)).toBe('high')
    })

    it('平日13時は混まない（普通）', () => {
      expect(preset.cells(MON, 13)).toBe('medium')
    })

    it('土日12-13時は混', () => {
      expect(preset.cells(SAT, 12)).toBe('high')
      expect(preset.cells(SAT, 13)).toBe('high')
      expect(preset.cells(SUN, 12)).toBe('high')
    })

    it('土日14時は普通', () => {
      expect(preset.cells(SAT, 14)).toBe('medium')
    })

    it('その他は普通', () => {
      expect(preset.cells(MON, 9)).toBe('medium')
      expect(preset.cells(SUN, 20)).toBe('medium')
    })
  })

  describe('週末カフェ型', () => {
    const preset = findPreset('週末カフェ型')

    it('土日14-16時は混', () => {
      expect(preset.cells(SAT, 14)).toBe('high')
      expect(preset.cells(SAT, 15)).toBe('high')
      expect(preset.cells(SAT, 16)).toBe('high')
      expect(preset.cells(SUN, 14)).toBe('high')
    })

    it('土日17時は普通', () => {
      expect(preset.cells(SAT, 17)).toBe('medium')
    })

    it('平日14-15時は空', () => {
      expect(preset.cells(MON, 14)).toBe('low')
      expect(preset.cells(FRI, 15)).toBe('low')
    })

    it('平日16時は普通', () => {
      expect(preset.cells(MON, 16)).toBe('medium')
    })
  })

  describe('夜型（映画館等）', () => {
    const preset = findPreset('夜型（映画館等）')

    it('土日17-20時は混', () => {
      expect(preset.cells(SAT, 17)).toBe('high')
      expect(preset.cells(SUN, 20)).toBe('high')
    })

    it('土日21時は普通', () => {
      expect(preset.cells(SAT, 21)).toBe('medium')
    })

    it('平日10-15時は空', () => {
      expect(preset.cells(MON, 10)).toBe('low')
      expect(preset.cells(FRI, 15)).toBe('low')
    })

    it('平日16時は普通', () => {
      expect(preset.cells(MON, 16)).toBe('medium')
    })
  })

  describe('朝夕2山型', () => {
    const preset = findPreset('朝夕2山型')

    it('土日11-13時（11:30-14:00を丸めた範囲）は混', () => {
      expect(preset.cells(SAT, 11)).toBe('high')
      expect(preset.cells(SAT, 12)).toBe('high')
      expect(preset.cells(SUN, 13)).toBe('high')
    })

    it('土日17-19時（17:30-19:30を丸めた範囲）は混', () => {
      expect(preset.cells(SAT, 17)).toBe('high')
      expect(preset.cells(SUN, 19)).toBe('high')
    })

    it('土日15時・20時は普通', () => {
      expect(preset.cells(SAT, 15)).toBe('medium')
      expect(preset.cells(SAT, 20)).toBe('medium')
    })

    it('平日14-16時は空', () => {
      expect(preset.cells(MON, 14)).toBe('low')
      expect(preset.cells(FRI, 16)).toBe('low')
    })
  })
})
