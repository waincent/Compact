import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { canManageCompany } from '@/lib/auth/authorize'
import { withApi, ok } from '@/lib/response'
import { ApiError, ForbiddenError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'

async function getCompany(id: number) {
  return prisma.company.findFirst({ where: { id, isDeleted: false } })
}

export const GET = withApi(async (_req, ctx) => {
  await requireUser()
  const { id } = await ctx.params
  const company = await getCompany(Number(id))
  if (!company) throw new ApiError(404, '公司不存在')
  const contractCount = await prisma.contract.count({
    where: {
      isDeleted: false,
      OR: [{ partyAId: company.id }, { partyBId: company.id }],
    },
  })
  return ok({ ...company, contractCount })
})

const updateSchema = z.object({
  name: z.string().min(1, '请输入公司全称').max(200),
  creditCode: z.string().max(50).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  contactName: z.string().max(50).optional().nullable(),
  contactPhone: z.string().max(20).optional().nullable(),
  bankName: z.string().max(100).optional().nullable(),
  bankAccount: z.string().max(50).optional().nullable(),
  remark: z.string().max(500).optional().nullable(),
  status: z.coerce.number().int().min(0).max(1).optional(),
})

export const PUT = withApi(async (req, ctx) => {
  const user = await requireUser()
  if (!canManageCompany(user)) throw new ForbiddenError('仅超级管理员可编辑公司')
  const { id } = await ctx.params
  const companyId = Number(id)

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')

  const existing = await getCompany(companyId)
  if (!existing) throw new ApiError(404, '公司不存在')

  const data = parsed.data
  // 停用校验:被合同引用时不允许停用
  if (data.status === 0 && existing.status === 1) {
    const activeRef = await prisma.contract.count({
      where: {
        isDeleted: false,
        OR: [{ partyAId: companyId }, { partyBId: companyId }],
      },
    })
    if (activeRef > 0) {
      throw new ApiError(400, `该公司被 ${activeRef} 份合同引用,不能停用`)
    }
  }

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name: data.name,
      creditCode: data.creditCode ?? null,
      address: data.address ?? null,
      phone: data.phone ?? null,
      contactName: data.contactName ?? null,
      contactPhone: data.contactPhone ?? null,
      bankName: data.bankName ?? null,
      bankAccount: data.bankAccount ?? null,
      remark: data.remark ?? null,
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  })

  await writeOpLog({ userId: user.id, module: 'company', action: 'UPDATE', businessType: 'company', businessId: company.id, detailJson: { name: company.name, status: company.status } })
  return ok(company)
})

export const DELETE = withApi(async (_req, ctx) => {
  const user = await requireUser()
  if (!canManageCompany(user)) throw new ForbiddenError('仅超级管理员可删除公司')
  const { id } = await ctx.params
  const companyId = Number(id)

  const existing = await getCompany(companyId)
  if (!existing) throw new ApiError(404, '公司不存在')

  // 被任意合同(未删除)引用时不允许删除
  const ref = await prisma.contract.count({
    where: {
      isDeleted: false,
      OR: [{ partyAId: companyId }, { partyBId: companyId }],
    },
  })
  if (ref > 0) {
    throw new ApiError(400, `该公司被 ${ref} 份合同引用,不能删除`)
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { isDeleted: true, deletedAt: new Date(), status: 0 },
  })

  await writeOpLog({ userId: user.id, module: 'company', action: 'DELETE', businessType: 'company', businessId: companyId, detailJson: { name: existing.name } })
  return ok(null)
})
