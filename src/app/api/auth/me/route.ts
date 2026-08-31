import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { withApi, ok } from '@/lib/response'

/** 当前登录用户信息(含最近 10 次登录日志) */
export const GET = withApi(async () => {
  const user = await requireUser()
  const [info, recentLogins] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, username: true, name: true, role: true,
        email: true, phone: true, avatar: true,
        mustChangePassword: true, lastLoginAt: true, lastLoginIp: true,
        createdAt: true,
      },
    }),
    prisma.loginLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { ip: true, success: true, createdAt: true },
    }),
  ])
  return ok({ user: info, recentLogins })
})
