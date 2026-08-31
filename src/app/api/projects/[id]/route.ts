import { z } from 'zod'
import { prisma, type Prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { assertCanOperateProject, companyContractWhere } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'
import { updateWithVersion } from '@/lib/db/optimisticLock'
import { softDelete } from '@/lib/db/softDelete'
import { toNumber } from '@/lib/money'

async function getProject(id: number) {
  return prisma.project.findFirst({
    where: { id, isDeleted: false },
    include: {
      creator: { select: { name: true } },
      _count: {
        select: {
          contracts: { where: { isDeleted: false } },
        },
      },
    },
  })
}

/**
 * 项目金额汇总:销售/采购合同总额、已开票/已收票总额
 * 发票口径与合同详情一致:status = 已开票、金额为正(排除已删除发票),金额用价税合计
 * 已开票=销售合同发票合计、已收票=采购合同发票合计(方向由合同类型推导,无独立 direction 字段)
 * companyId:按公司主体过滤(项目下合同可能跨公司,选公司后只统计该公司合同)
 */
async function projectSummary(projectId: number, companyId: number | null) {
  const contractWhere: Prisma.ContractWhereInput = {
    projectId,
    isDeleted: false,
    ...companyContractWhere(companyId),
  }
  const [contractGroups, invoices] = await Promise.all([
    prisma.contract.groupBy({
      by: ['contractType'],
      where: contractWhere,
      _sum: { totalAmount: true },
    }),
    prisma.invoice.findMany({
      where: {
        isDeleted: false,
        amount: { gt: 0 },
        contract: { ...contractWhere, isDeleted: false, projectId },
      },
      select: { totalAmountWithTax: true, contract: { select: { contractType: true } } },
    }),
  ])
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
  return {
    salesContractTotal: toNumber(contractGroups.find((g) => g.contractType === 1)?._sum.totalAmount ?? 0),
    purchaseContractTotal: toNumber(contractGroups.find((g) => g.contractType === 2)?._sum.totalAmount ?? 0),
    invoiceOut: sum(invoices.filter((i) => i.contract.contractType === 1).map((i) => toNumber(i.totalAmountWithTax))),
    invoiceIn: sum(invoices.filter((i) => i.contract.contractType === 2).map((i) => toNumber(i.totalAmountWithTax))),
  }
}

/** 项目是否属于当前公司主体(项目下存在合同属于该公司) */
async function projectInCompany(projectId: number, companyId: number | null): Promise<boolean> {
  if (companyId == null) return true
  const count = await prisma.contract.count({
    where: { projectId, isDeleted: false, ...companyContractWhere(companyId) },
  })
  return count > 0
}

export const GET = withApi(async (_req, ctx) => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const project = await getProject(Number(id))
  if (!project || !(await projectInCompany(project.id, companyId))) throw new ApiError(404, '项目不存在')
  const summary = await projectSummary(project.id, companyId)
  return ok({ ...project, summary })
})

const updateSchema = z.object({
  name: z.string().min(1, '请输入项目名称').max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  status: z.coerce.number().int().min(1).max(2).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  version: z.coerce.number().int(),
})

export const PUT = withApi(async (req, ctx) => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const projectId = Number(id)

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')
  const data = parsed.data

  const existing = await prisma.project.findFirst({ where: { id: projectId, isDeleted: false } })
  if (!existing || !(await projectInCompany(existing.id, companyId))) throw new ApiError(404, '项目不存在')
  assertCanOperateProject(user)

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description || null
  if (data.status !== undefined) updateData.status = data.status

  if (data.startDate !== undefined || data.endDate !== undefined) {
    const start = data.startDate ? new Date(data.startDate) : existing.startDate
    const end = data.endDate ? new Date(data.endDate) : existing.endDate
    if (end < start) throw new ApiError(400, '结束日期不能早于开始日期')
    updateData.startDate = start
    updateData.endDate = end
  }

  const updated = await prisma.$transaction(async (tx) => {
    const okFlag = await updateWithVersion('project', projectId, data.version, updateData, tx)
    if (!okFlag) throw new ApiError(409, '数据已被他人修改,请刷新后重试')
    return tx.project.findFirst({ where: { id: projectId }, include: { creator: { select: { name: true } } } })
  })

  await writeOpLog({ userId: user.id, module: 'project', action: 'UPDATE', businessType: 'project', businessId: projectId, detailJson: { name: updated?.name } })
  return ok(updated)
})

export const DELETE = withApi(async (_req, ctx) => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const projectId = Number(id)

  const existing = await prisma.project.findFirst({ where: { id: projectId, isDeleted: false } })
  if (!existing || !(await projectInCompany(existing.id, companyId))) throw new ApiError(404, '项目不存在')
  assertCanOperateProject(user)

  const contractCount = await prisma.contract.count({ where: { projectId, isDeleted: false } })
  if (contractCount > 0) {
    throw new ApiError(400, `该项目下仍有 ${contractCount} 份合同,不能删除`)
  }

  await prisma.$transaction(async (tx) => {
    await softDelete('project', projectId, tx)
  })

  await writeOpLog({ userId: user.id, module: 'project', action: 'DELETE', businessType: 'project', businessId: projectId, detailJson: { name: existing.name } })
  return ok(null)
})
