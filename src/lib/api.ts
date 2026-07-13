const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

function authHeaders(): Record<string, string> {
  const storedUser = localStorage.getItem('user')
  const userId = storedUser ? (JSON.parse(storedUser).id as string) : undefined
  return userId ? { 'x-user-id': userId } : {}
}

async function parseResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => undefined)

  if (!res.ok) {
    throw new ApiError(body?.message ?? body?.error ?? `リクエストに失敗しました (${res.status})`, res.status)
  }

  return body as T
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  })

  return parseResponse<T>(res)
}

// multipart/form-data 送信用。Content-Type はブラウザに boundary 付きで
// 自動設定させるため明示的に指定しない。
async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })

  return parseResponse<T>(res)
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => uploadFile<T>(path, formData),
}
