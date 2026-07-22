import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// jsdom（testEnvironment）にはTextEncoder/TextDecoderが無いため、実際の
// @anthropic-ai/sdkモジュールをロードするテスト（Issue #117/#118対応で
// PlanGenerationError/RateLimitError等の実クラスをinstanceof判定に使うテストを追加）が
// 起動時エラーになる。Node標準のutilモジュールから補ってグローバルに登録する
if (typeof (global as { TextEncoder?: unknown }).TextEncoder === 'undefined') {
  (global as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder
}
if (typeof (global as { TextDecoder?: unknown }).TextDecoder === 'undefined') {
  (global as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder
}

// Mock API client（import.meta.env を使うため、ts-jest(CommonJS)下では直接読み込めない）
jest.mock('../src/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock as any

// Mock window.matchMedia（node環境のサーバーサイドテストではwindowが存在しないためスキップ）
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}
