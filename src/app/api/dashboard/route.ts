import { prisma, type Prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { withApi, ok } from '@/lib/response'
import { contractScope, companyContractWhere, companyProjectWhere } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { toNumber } from '@/lib/money'

/**
 * 首页聚合 API:项目数量、合同数量/金额、销售/采购金额、开票/收票金额、留底/已交纳税额。
 * 全部统计未删除数据,并按公司主体(companyContractWhere)与成员范围(contractScope)过滤。
 */
export const GET = withApi(async () => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const scope = contractScope(user) // 普通成员仅统计自己创建的合同
  const companyWhere = companyContractWhere(companyId) // 公司主体过滤(甲方或乙方任一)
  const contractWhere: Prisma.ContractWhereInput = { isDeleted: false, ...scope, ...companyWhere }

  // 发票统计口径:仅金额>0;销项=销售合同(开票)、进项=采购合同(收票)
  const invoiceWhere = (contractType: number): Prisma.InvoiceWhereInput => ({
    isDeleted: false,
    amount: { gt: 0 },
    contract: { isDeleted: false, contractType, ...scope, ...companyWhere },
  })

  const [contractAgg, projectCount, salesAgg, purchaseAgg, invoiceOutAgg, invoiceInAgg] =
    await Promise.all([
      prisma.contract.aggregate({
        where: contractWhere,
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      prisma.project.count({ where: { isDeleted: false, ...companyProjectWhere(companyId) } }),
      prisma.contract.aggregate({ where: { ...contractWhere, contractType: 1 }, _sum: { totalAmount: true } }),
      prisma.contract.aggregate({ where: { ...contractWhere, contractType: 2 }, _sum: { totalAmount: true } }),
      prisma.invoice.aggregate({ where: invoiceWhere(1), _sum: { totalAmountWithTax: true, taxAmount: true } }),
      prisma.invoice.aggregate({ where: invoiceWhere(2), _sum: { totalAmountWithTax: true, taxAmount: true } }),
    ])

  const invoiceOutTax = toNumber(invoiceOutAgg._sum.taxAmount) // 销项税额(开票税额)
  const invoiceInTax = toNumber(invoiceInAgg._sum.taxAmount) // 进项税额(收票税额)

  return ok({
    stats: {
      activeProjectCount: projectCount,
      activeContractCount: contractAgg._count.id,
      contractTotal: toNumber(contractAgg._sum.totalAmount),
      salesTotal: toNumber(salesAgg._sum.totalAmount),
      purchaseTotal: toNumber(purchaseAgg._sum.totalAmount),
      invoiceOutTotal: toNumber(invoiceOutAgg._sum.totalAmountWithTax),
      invoiceInTotal: toNumber(invoiceInAgg._sum.totalAmountWithTax),
      // 留底税额 = 进项大于销项的部分(留抵结转);已交纳税额 = 销项大于进项的部分(净应交)
      leftoverTax: Math.max(0, invoiceInTax - invoiceOutTax),
      paidTax: Math.max(0, invoiceOutTax - invoiceInTax),
    },
  })
})
