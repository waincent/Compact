import { prisma, type Prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { contractInCompany } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'

/** 合同下资金记录列表(详情 Tab 用;收款/付款由合同类型推导) */
export const GET = withApi(async (_req, ctx) => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const contractId = Number(id)

  const contract = await prisma.contract.findFirst({ where: { id: contractId, isDeleted: false } })
  if (!contract || !contractInCompany(contract, companyId)) throw new ApiError(404, '合同不存在')

  const where: Prisma.PaymentRecordWhereInput = { contractId, isDeleted: false }

  const list = await prisma.paymentRecord.findMany({
    where,
    orderBy: { recordDate: 'desc' },
    include: {
      creator: { select: { name: true } },
    },
  })

  // 批量补凭证附件原始名
  const voucherIds = [...new Set(list.map((p) => p.voucherAttachmentId).filter(Boolean))] as number[]
  const vouchers = voucherIds.length
    ? await prisma.attachment.findMany({
        where: { id: { in: voucherIds } },
        select: { id: true, originalName: true },
      })
    : []
  const voucherMap = new Map(vouchers.map((v) => [v.id, v.originalName]))

  return ok(list.map((p) => ({
    id: p.id,
    contractId: p.contractId,
    /** 收款/付款由合同类型推导:销售=收款、采购=付款 */
    contractType: contract.contractType,
    amount: Number(p.amount),
    status: p.status,
    recordDate: p.recordDate,
    version: p.version,
    createdByName: p.creator?.name,
    voucherId: p.voucherAttachmentId,
    voucherName: p.voucherAttachmentId ? voucherMap.get(p.voucherAttachmentId) ?? null : null,
  })))
})
