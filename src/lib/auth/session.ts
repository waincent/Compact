import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken, COOKIE_NAME, type SessionPayload } from '@/lib/auth/jwt'
import { ForbiddenError, UnauthorizedError } from '@/lib/errors'

/** 完整会话用户(含数据库实时状态) */
export interface SessionUser extends SessionPayload {
  id: number
  status: number
  mustChangePassword: boolean
  /** 所属公司(超管可为 null) */
  companyId: number | null
}

/** 从请求 cookie 中读取并校验当前用户(每次查库取最新状态) */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload) return null
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, status: 1 },
    select: {
      id: true, username: true, name: true, role: true,
      status: true, mustChangePassword: true, companyId: true,
    },
  })
  if (!user) return null
  return {
    ...payload, id: payload.sub,
    status: user.status, mustChangePassword: user.mustChangePassword,
    companyId: user.companyId,
  }
}

/** 要求已登录 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}

/** 要求已登录且角色在允许列表中 */
export async function requireRole(roles: number[]): Promise<SessionUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) throw new ForbiddenError()
  return user
}

/** 要求超管 */
export async function requireAdmin(): Promise<SessionUser> {
  return requireRole([1])
}
