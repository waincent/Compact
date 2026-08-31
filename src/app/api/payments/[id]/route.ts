import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/session'
import { ROLE, contractInCompany } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'

/** 删除资金记录:软删除,从列表与统计中消失 */
export const DELETE = withApi(async (_req, ctx) => {
  const user = await requireRole([ROLE.SUPER_ADMIN, ROLE.FINANCE])
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const paymentId = Number(id)

  const payment = await prisma.paymentRecord.findFirst({
    where: { id: paymentId, isDeleted: false },
    include: { contract: { select: { id: true, partyAId: true, partyBId: true } } },
  })
  if (!payment || !contractInCompany(payment.contract, companyId)) throw new ApiError(404, '资金记录不存在')

  await prisma.paymentRecord.update({
    where: { id: paymentId },
    data: { isDeleted: true, deletedAt: new Date(), version: { increment: 1 } },
  })

  // 联动删除凭证附件记录(磁盘文件与合同附件一致不做物理清理)
  if (payment.voucherAttachmentId) {
    await prisma.attachment.delete({ where: { id: payment.voucherAttachmentId } }).catch(() => {})
  }

  await writeOpLog({
    userId: user.id,
    module: 'payment',
    action: 'DELETE',
    businessType: 'payment',
    businessId: paymentId,
    detailJson: { amount: Number(payment.amount), contractId: payment.contractId },
  })
  return ok({ id: paymentId })
})
