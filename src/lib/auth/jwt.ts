import { SignJWT, jwtVerify } from 'jose'

export interface SessionPayload {
  /** 用户 ID */
  sub: number
  username: string
  name: string
  role: number
}

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'compact-dev-secret-change-me',
)

/** 签发 token,expiresIn 单位秒 */
export async function signToken(payload: SessionPayload, expiresIn: number): Promise<string> {
  return new SignJWT({ ...payload, sub: String(payload.sub) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(SECRET)
}

/** 校验 token,失败返回 null */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    if (!payload.sub) return null
    return {
      sub: Number(payload.sub),
      username: String(payload.username ?? ''),
      name: String(payload.name ?? ''),
      role: Number(payload.role ?? 4),
    }
  } catch {
    return null
  }
}

/** 记住我 → 30 天;普通会话 → 1 天(秒) */
export const REMEMBER_ME_SECONDS = 30 * 24 * 60 * 60
export const SESSION_SECONDS = 24 * 60 * 60

/** 会话 cookie 名称 */
export const COOKIE_NAME = 'compact_token'
