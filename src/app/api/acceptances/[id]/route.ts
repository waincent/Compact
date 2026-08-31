import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/session'
import { contractInCompany, ROLE } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'

/** 删除验收单据(联动删除验收单文件附件记录,磁盘文件不清理) */
export const DELETE = withApi(async (_req, ctx) => {
  const user = await requireRole([ROLE.SUPER_ADMIN, ROLE.FINANCE])
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const acceptanceId = Number(id)

  const doc = await prisma.acceptanceDoc.findFirst({
    where: { id: acceptanceId },
    include: { contract: { select: { id: true, name: true, partyAId: true, partyBId: true } } },
  })
  if (!doc || !contractInCompany(doc.contract, companyId)) throw new ApiError(404, '验收单据不存在')

  await prisma.$transaction(async (tx) => {
    if (doc.attachmentId) {
      await tx.attachment.delete({ where: { id: doc.attachmentId } }).catch(() => {})
    }
    await tx.acceptanceDoc.delete({ where: { id: acceptanceId } })
  })

  await writeOpLog({ userId: user.id, module: 'contract', action: 'DELETE_ACCEPTANCE', businessType: 'contract', businessId: doc.contract.id, detailJson: { name: doc.contract.name } })
  return ok(null)
})
