import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser, requireRole } from '@/lib/auth/session'
import { contractInCompany, ROLE } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'

const acceptanceInclude = {
  creator: { select: { name: true } },
  attachment: { select: { id: true, originalName: true, fileSize: true, mimeType: true } },
} as const

/** 合同验收单据列表(验收日期 + 验收单文件) */
export const GET = withApi(async (_req, ctx) => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const contractId = Number(id)

  const contract = await prisma.contract.findFirst({ where: { id: contractId, isDeleted: false } })
  if (!contract || !contractInCompany(contract, companyId)) throw new ApiError(404, '合同不存在')

  const list = await prisma.acceptanceDoc.findMany({
    where: { contractId },
    orderBy: { acceptDate: 'desc' },
    include: acceptanceInclude,
  })

  return ok(list.map((a) => ({
    id: a.id,
    acceptDate: a.acceptDate,
    createdAt: a.createdAt,
    createdByName: a.creator?.name,
    attachment: a.attachment ?? null,
  })))
})

const createSchema = z.object({
  acceptDate: z.string().min(1, '请选择验收日期'),
})

/** 新增验收单据(先登记,验收单文件随后通过 upload 回写 attachmentId) */
export const POST = withApi(async (req, ctx) => {
  const user = await requireRole([ROLE.SUPER_ADMIN, ROLE.FINANCE])
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const contractId = Number(id)

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')

  const contract = await prisma.contract.findFirst({ where: { id: contractId, isDeleted: false } })
  if (!contract || !contractInCompany(contract, companyId)) throw new ApiError(404, '合同不存在')

  const created = await prisma.acceptanceDoc.create({
    data: {
      contractId,
      acceptDate: new Date(parsed.data.acceptDate),
      createdBy: user.id,
    },
    include: acceptanceInclude,
  })

  await writeOpLog({ userId: user.id, module: 'contract', action: 'CREATE_ACCEPTANCE', businessType: 'contract', businessId: contractId, detailJson: { acceptDate: parsed.data.acceptDate } })
  return ok({ id: created.id })
})
