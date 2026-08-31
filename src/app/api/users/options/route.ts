import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { withApi, ok } from '@/lib/response'

/** 活跃用户选项(负责人下拉等) */
export const GET = withApi(async () => {
  await requireUser()
  const list = await prisma.user.findMany({
    where: { status: 1 },
    orderBy: { id: 'asc' },
    select: { id: true, name: true, username: true, role: true },
  })
  return ok(list)
})
