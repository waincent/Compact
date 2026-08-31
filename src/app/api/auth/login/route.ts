import { cookies } from 'next/headers'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { withApi, ok, fail } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { signToken, COOKIE_NAME, SESSION_SECONDS, REMEMBER_ME_SECONDS } from '@/lib/auth/jwt'

const LOCK_AFTER_FAILURES = 5
const LOCK_MINUTES = 15

const schema = z.object({
  username: z.string().min(1, '请输入账号'),
  password: z.string().min(1, '请输入密码'),
  remember: z.boolean().optional(),
})

function getClientIp(req: Request): string | undefined {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? undefined
}

export const POST = withApi(async (req) => {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')
  }
  const { username, password, remember } = parsed.data
  const ip = getClientIp(req)

  const user = await prisma.user.findUnique({ where: { username } })

  // 账号不存在:统一提示,避免枚举
  if (!user) {
    await prisma.loginLog.create({ data: { username, ip, success: false } })
    throw new ApiError(400, '账号或密码错误')
  }
  if (user.status !== 1) {
    await prisma.loginLog.create({ data: { userId: user.id, username, ip, success: false } })
    throw new ApiError(403, '账号已停用,请联系管理员')
  }

  // 锁定判断
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    await prisma.loginLog.create({ data: { userId: user.id, username, ip, success: false } })
    throw new ApiError(423, `登录失败次数过多,账号已锁定,请 ${remainMin} 分钟后再试`)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    const newCount = user.failedLoginCount + 1
    let lockedUntil: Date | null = null
    if (newCount >= LOCK_AFTER_FAILURES) {
      lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: lockedUntil ? 0 : newCount, lockedUntil },
    })
    await prisma.loginLog.create({ data: { userId: user.id, username, ip, success: false } })
    const remain = LOCK_AFTER_FAILURES - newCount
    throw new ApiError(400, lockedUntil ? `连续失败 ${LOCK_AFTER_FAILURES} 次,账号已锁定 ${LOCK_MINUTES} 分钟` : `密码错误,还可尝试 ${remain} 次`)
  }

  // 登录成功
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip },
  })
  await prisma.loginLog.create({ data: { userId: user.id, username, ip, success: true } })

  const token = await signToken(
    { sub: user.id, username: user.username, name: user.name, role: user.role },
    remember ? REMEMBER_ME_SECONDS : SESSION_SECONDS,
  )
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    // 纯 http 部署下 Secure cookie 会被浏览器拒绝(登录态丢失);
    // 仅当显式设置 COOKIE_SECURE=true(接入 HTTPS 后)才启用 Secure 标记
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: remember ? REMEMBER_ME_SECONDS : SESSION_SECONDS,
  })

  return ok({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  })
})
