/** 业务错误,携带 HTTP 状态码,由 withApi 统一捕获转成 JSON 响应 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** 乐观锁冲突 */
export class ConflictError extends ApiError {
  constructor(message = '数据已被他人修改,请刷新后重试') {
    super(409, message, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

/** 权限不足 */
export class ForbiddenError extends ApiError {
  constructor(message = '无权限执行该操作') {
    super(403, message, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

/** 未登录 */
export class UnauthorizedError extends ApiError {
  constructor(message = '请先登录') {
    super(401, message, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}
