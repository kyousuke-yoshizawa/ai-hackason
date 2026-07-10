import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthContext } from '../src/context/AuthContext'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authState?: {
    user: any
    isAuthenticated: boolean
    isLoading: boolean
    login: jest.Mock
    logout: jest.Mock
  }
}

const defaultAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
}

export function renderWithAuth(
  ui: ReactElement,
  {
    authState = defaultAuthState,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactElement }) {
    return (
      <AuthContext.Provider value={authState}>
        {children}
      </AuthContext.Provider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Test data generators
export const testData = {
  user: {
    admin: {
      id: 'admin-123',
      email: 'yoshizawa@ai-hackason.example',
      role: 'admin',
      created_at: new Date().toISOString(),
    },
    storeManager: {
      id: 'manager-456',
      email: 'satoh@ai-hackason.example',
      role: 'store_manager',
      created_at: new Date().toISOString(),
    },
    regularUser: {
      id: 'user-789',
      email: 'itagaki@ai-hackason.example',
      role: 'user',
      created_at: new Date().toISOString(),
    },
  },
  store: {
    sample: {
      id: 'store-001',
      name: 'Sample Store',
      x_coord: 10,
      y_coord: 20,
      created_by: 'admin-123',
      created_at: new Date().toISOString(),
    },
  },
  crowd: {
    sample: {
      id: 'crowd-001',
      store_id: 'store-001',
      level: 'medium' as const,
      updated_by: 'manager-456',
      updated_at: new Date().toISOString(),
    },
  },
}

// API test utilities
export function mockApiResponse(status: number, data: any) {
  return Promise.resolve({
    status,
    json: () => Promise.resolve(data),
  })
}

export function mockApiError(status: number, message: string) {
  return Promise.reject({
    response: {
      status,
      data: { error: message },
    },
  })
}

// Wait utilities
export function waitFor(condition: () => boolean, timeout = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval)
        resolve()
      }
      if (Date.now() - startTime > timeout) {
        clearInterval(interval)
        reject(new Error('Timeout waiting for condition'))
      }
    }, 50)
  })
}
