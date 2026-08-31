import { prisma } from '@/lib/prisma'
import { withApi, ok } from '@/lib/response'

/** 登录页账号列表:启用中的账号(含所属公司名,便于展示) */
export const GET = withApi(async () => {
  const users = await prisma.user.findMany({
    where: { status: 1 },
    select: {
      id: true,
      username: true,
      name: true,
      companyId: true,
      company: { select: { name: true } },
    },
    orderBy: [{ companyId: 'asc' }, { id: 'asc' }],
  })

  return ok({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      companyId: u.companyId,
      companyName: u.company?.name ?? null,
    })),
  })
})
