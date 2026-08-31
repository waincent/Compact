import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { contractInCompany } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'

/** 合同原件列表(businessType='contract' 的合同级附件) */
export const GET = withApi(async (_req, ctx) => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const contractId = Number(id)

  const contract = await prisma.contract.findFirst({ where: { id: contractId, isDeleted: false } })
  if (!contract || !contractInCompany(contract, companyId)) throw new ApiError(404, '合同不存在')

  const list = await prisma.attachment.findMany({
    where: { businessType: 'contract', businessId: contractId },
    orderBy: { createdAt: 'desc' },
    include: { creator: { select: { name: true } } },
  })

  return ok(list.map((a) => ({
    id: a.id,
    originalName: a.originalName,
    fileSize: a.fileSize,
    mimeType: a.mimeType,
    createdAt: a.createdAt,
    createdByName: a.creator?.name,
  })))
})
