import handler from '../../api/area/index'
import { AREA_NAME, LANDMARKS } from '../../backend/domains/area/landmarks'
import type { VercelRequest, VercelResponse } from '@vercel/node'

function createMockRes() {
  const res: Partial<VercelResponse> & { statusCode?: number; body?: unknown; headers?: Record<string, string> } = {
    headers: {},
  }
  res.status = jest.fn((code: number) => {
    res.statusCode = code
    return res as VercelResponse
  }) as unknown as VercelResponse['status']
  res.json = jest.fn((body: unknown) => {
    res.body = body
    return res as VercelResponse
  }) as unknown as VercelResponse['json']
  res.setHeader = jest.fn((name: string, value: string) => {
    res.headers![name] = value
    return res as VercelResponse
  }) as unknown as VercelResponse['setHeader']
  return res as VercelResponse & { statusCode: number; body: unknown; headers: Record<string, string> }
}

// TC-101: GET /api/area のレスポンス形式検証（Issue #101）
describe('GET /api/area', () => {
  it('returns the area name and the full landmark list', async () => {
    const res = createMockRes()

    await handler({ method: 'GET', query: {} } as unknown as VercelRequest, res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ area_name: AREA_NAME, landmarks: LANDMARKS })
  })

  it('each landmark has the expected shape (name/x/y/kind)', async () => {
    const res = createMockRes()

    await handler({ method: 'GET', query: {} } as unknown as VercelRequest, res)

    const body = res.body as { landmarks: Array<{ name: string; x: number; y: number; kind: string }> }
    expect(body.landmarks.length).toBeGreaterThan(0)
    for (const landmark of body.landmarks) {
      expect(typeof landmark.name).toBe('string')
      expect(typeof landmark.x).toBe('number')
      expect(typeof landmark.y).toBe('number')
      expect(typeof landmark.kind).toBe('string')
      // MapPicker/StoreForm が扱う0〜400のグリッド範囲に収まっていること
      expect(landmark.x).toBeGreaterThanOrEqual(0)
      expect(landmark.x).toBeLessThanOrEqual(400)
      expect(landmark.y).toBeGreaterThanOrEqual(0)
      expect(landmark.y).toBeLessThanOrEqual(400)
    }
  })

  it('rejects non-GET methods with 405 and an Allow header', async () => {
    const res = createMockRes()

    await handler({ method: 'POST', query: {} } as unknown as VercelRequest, res)

    expect(res.statusCode).toBe(405)
    expect(res.headers['Allow']).toBe('GET')
    expect(res.body).toMatchObject({ error: 'method_not_allowed' })
  })
})
