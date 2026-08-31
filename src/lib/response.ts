import { ApiError } from '@/lib/errors'

/** 统一成功响应 */
export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ success: true, data }, init)
}

/** 统一失败响应 */
export function fail(message: string, status = 400, code?: string): Response {
  return Response.json({ success: false, message, code }, { status })
}

/** 分页成功响应 */
export function okPage<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): Response {
  return ok({ list: data, total, page, pageSize })
}

/** API 处理器包装:统一异常转 JSON */
export function withApi(
  handler: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>,
): (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof ApiError) {
        return fail(err.message, err.status, err.code)
      }
      // Prisma 已知错误
      const e = err as { code?: string; meta?: { target?: string[] } }
      if (e?.code === 'P2002') {
        const target = e.meta?.target?.join(', ')
        return fail(`数据已存在(唯一约束冲突:${target ?? '未知字段'}),请检查后重试`, 409, 'UNIQUE')
      }
      if (e?.code === 'P2025') {
        return fail('记录不存在或已被删除', 404, 'NOT_FOUND')
      }
      console.error('[API ERROR]', req.method, req.url, err)
      return fail('服务器内部错误', 500, 'INTERNAL')
    }
  }
}
