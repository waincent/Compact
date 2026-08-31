import { prisma, type Prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { withApi, ok } from '@/lib/response'
import { contractScope, companyContractWhere } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { toNumber } from '@/lib/money'

/** 首页聚合 API:合同数量 + 合同总金额(统计全部未删除合同) */
export const GET = withApi(async () => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const scope = contractScope(user) // 普通成员仅统计自己创建的合同
  const companyWhere = companyContractWhere(companyId) // 公司主体过滤(甲方或乙方任一)
  const contractWhere: Prisma.ContractWhereInput = { isDeleted: false, ...scope, ...companyWhere }

  const agg = await prisma.contract.aggregate({
    where: contractWhere,
    _count: { id: true },
    _sum: { totalAmount: true },
  })

  return ok({
    stats: {
      activeContractCount: agg._count.id,
      contractTotal: toNumber(agg._sum.totalAmount),
    },
  })
})
