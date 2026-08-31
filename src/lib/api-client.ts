'use client'

/** 前端 API 调用封装:自动 JSON 序列化、统一错误抛出 */
async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: options.body
      ? { 'Content-Type': 'application/json', ...options.headers }
      : options.headers,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = (data as { message?: string })?.message ?? `请求失败(${res.status})`
    const err = new Error(msg) as Error & { status?: number; code?: string }
    err.status = res.status
    err.code = (data as { code?: string })?.code
    throw err
  }
  return (data as { data: T }).data
}

export const api = {
  get: <T = unknown>(path: string, params?: Record<string, string | number | undefined>) => {
    const url = new URL(path, window.location.origin)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
      }
    }
    return request<T>(url.pathname + url.search)
  },
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T = unknown>(path: string) => request<T>(path, { method: 'DELETE' }),
}
