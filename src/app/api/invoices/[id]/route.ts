import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/session'
import { ROLE, contractInCompany } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'

/** 删除发票:软删除,从列表与统计中消失 */
export const DELETE = withApi(async (_req, ctx) => {
  const user = await requireRole([ROLE.SUPER_ADMIN, ROLE.FINANCE])
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const invoiceId = Number(id)

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, isDeleted: false },
    include: { contract: { select: { id: true, partyAId: true, partyBId: true } } },
  })
  if (!invoice || !contractInCompany(invoice.contract, companyId)) throw new ApiError(404, '发票不存在')

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { isDeleted: true, deletedAt: new Date(), version: { increment: 1 } },
  })

  // 联动删除发票文件(附件记录;磁盘文件与合同附件一致不做物理清理)
  if (invoice.fileAttachmentId) {
    await prisma.attachment.delete({ where: { id: invoice.fileAttachmentId } }).catch(() => {})
  }

  await writeOpLog({
    userId: user.id,
    module: 'invoice',
    action: 'DELETE',
    businessType: 'invoice',
    businessId: invoiceId,
    detailJson: { invoiceNumber: invoice.invoiceNumber, contractId: invoice.contractId },
  })
  return ok({ id: invoiceId })
})
