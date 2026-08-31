import { prisma } from '@/lib/prisma'
import { withApi, ok } from '@/lib/response'
import { requireUser } from '@/lib/auth/session'
import { ROLE } from '@/lib/auth/authorize'
import { getRawCompanyId } from '@/lib/auth/company-context'

/**
 * 顶栏公司主体选择数据:
 * - 超管:可选全部启用公司,current 取 cookie(合法值)或 null(=全部)。
 * - 非超管:仅自己所属公司,current = 自己公司。
 */
export const GET = withApi(async () => {
  const user = await requireUser()

  if (user.role === ROLE.SUPER_ADMIN) {
    const companies = await prisma.company.findMany({
      where: { isDeleted: false, status: 1 },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    })
    const raw = await getRawCompanyId()
    const current = raw != null && companies.some((c) => c.id === raw) ? raw : null
    return ok({ companies, current })
  }

  // 非超管:仅自己公司
  if (user.companyId == null) {
    return ok({ companies: [], current: null })
  }
  const company = await prisma.company.findFirst({
    where: { id: user.companyId, isDeleted: false, status: 1 },
    select: { id: true, name: true },
  })
  return ok({
    companies: company ? [company] : [],
    current: company ? company.id : null,
  })
})
