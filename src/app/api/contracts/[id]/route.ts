import { z } from 'zod'
import { prisma, type Prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { assertCanOperateContract, contractInCompany } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'
import { updateWithVersion } from '@/lib/db/optimisticLock'
import { softDelete } from '@/lib/db/softDelete'
import { toNumber } from '@/lib/money'

const detailSelect = {
  id: true, code: true, name: true, projectId: true, partyAId: true, partyBId: true,
  contractType: true, totalAmount: true, signDate: true, startDate: true, endDate: true,
  version: true, createdAt: true, updatedAt: true,
  project: { select: { id: true, name: true, code: true, status: true } },
  partyA: { select: { id: true, name: true, contactName: true, contactPhone: true, bankName: true, bankAccount: true } },
  partyB: { select: { id: true, name: true, contactName: true, contactPhone: true, bankName: true, bankAccount: true } },
  creator: { select: { id: true, name: true, username: true } },
  _count: {
    select: {
      payments: { where: { isDeleted: false } },
      invoices: { where: { isDeleted: false } },
    },
  },
} satisfies Prisma.ContractSelect

/** 合同汇总统计(收/付款进度、开票/收票进度) */
async function contractStats(contractId: number, contractType: number) {
  const [payments, invoices] = await Promise.all([
    prisma.paymentRecord.findMany({
      where: { contractId, isDeleted: false },
      select: { amount: true },
    }),
    prisma.invoice.findMany({
      where: { contractId, isDeleted: false, amount: { gt: 0 } },
      select: { amount: true, taxAmount: true, totalAmountWithTax: true },
    }),
  ])
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
  // 收款/付款由合同类型推导:销售=收款、采购=付款(合同下方向必然一致)
  const paymentTotal = sum(payments.map((p) => toNumber(p.amount)))
  const receive = contractType === 1 ? paymentTotal : 0
  const pay = contractType === 2 ? paymentTotal : 0
  // 发票销项/进项由合同类型推导:销售=销项(开票)、采购=进项(收票)
  const invoiceTotal = sum(invoices.map((i) => toNumber(i.totalAmountWithTax)))
  const invoiceOut = contractType === 1 ? invoiceTotal : 0
  const invoiceIn = contractType === 2 ? invoiceTotal : 0
  return { receive, pay, invoiceOut, invoiceIn }
}

export const GET = withApi(async (_req, ctx) => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const contractId = Number(id)

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, isDeleted: false },
    select: detailSelect,
  })
  if (!contract || !contractInCompany(contract, companyId)) throw new ApiError(404, '合同不存在')

  const stats = await contractStats(contractId, contract.contractType)
  const total = toNumber(contract.totalAmount)

  return ok({
    ...contract,
    stats: {
      ...stats,
      receivePercent: total > 0 ? Math.min(100, Math.round((stats.receive / total) * 100)) : 0,
      payPercent: total > 0 ? Math.min(100, Math.round((stats.pay / total) * 100)) : 0,
      invoiceOutPercent: total > 0 ? Math.min(100, Math.round((stats.invoiceOut / total) * 100)) : 0,
      invoiceInPercent: total > 0 ? Math.min(100, Math.round((stats.invoiceIn / total) * 100)) : 0,
      total,
    },
  })
})

const updateSchema = z.object({
  name: z.string().min(1, '请输入合同名称').max(200).optional(),
  projectId: z.coerce.number().int().min(1).optional(),
  partyAId: z.coerce.number().int().min(1).optional(),
  partyBId: z.coerce.number().int().min(1).optional(),
  contractType: z.coerce.number().int().min(1).max(2).optional(),
  totalAmount: z.coerce.number().min(0.01).optional(),
  signDate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  version: z.coerce.number().int(),
})

export const PUT = withApi(async (req, ctx) => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const contractId = Number(id)

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')
  const data = parsed.data

  const existing = await prisma.contract.findFirst({ where: { id: contractId, isDeleted: false } })
  if (!existing || !contractInCompany(existing, companyId)) throw new ApiError(404, '合同不存在')
  assertCanOperateContract(user, existing)

  // 金额调整校验:新合同金额不能低于已发生的资金(收款/付款)与已开票合计
  if (data.totalAmount !== undefined) {
    const [payments, invoices] = await Promise.all([
      prisma.paymentRecord.findMany({
        where: { contractId, isDeleted: false },
        select: { amount: true },
      }),
      prisma.invoice.findMany({
        where: { contractId, isDeleted: false, amount: { gt: 0 } },
        select: { totalAmountWithTax: true },
      }),
    ])
    const paymentTotal = toNumber(payments.reduce((sum, p) => sum + toNumber(p.amount), 0))
    const invoiceTotal = toNumber(invoices.reduce((sum, i) => sum + toNumber(i.totalAmountWithTax), 0))
    const minTotal = Math.max(paymentTotal, invoiceTotal)
    if (toNumber(data.totalAmount) < minTotal) {
      throw new ApiError(400, `新合同金额不能低于已发生的资金/发票合计 ¥${minTotal.toFixed(2)}`)
    }
  }

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.projectId !== undefined) updateData.projectId = data.projectId
  if (data.partyAId !== undefined) updateData.partyAId = data.partyAId
  if (data.partyBId !== undefined) updateData.partyBId = data.partyBId
  if (data.contractType !== undefined) updateData.contractType = data.contractType
  if (data.totalAmount !== undefined) updateData.totalAmount = toNumber(data.totalAmount)

  if (data.signDate !== undefined || data.startDate !== undefined || data.endDate !== undefined) {
    const sign = data.signDate ? new Date(data.signDate) : existing.signDate
    const start = data.startDate ? new Date(data.startDate) : existing.startDate
    const end = data.endDate ? new Date(data.endDate) : existing.endDate
    if (end < start) throw new ApiError(400, '合同结束日期不能早于开始日期')
    updateData.signDate = sign
    updateData.startDate = start
    updateData.endDate = end
  }

  const updated = await prisma.$transaction(async (tx) => {
    const okFlag = await updateWithVersion('contract', contractId, data.version, updateData, tx)
    if (!okFlag) throw new ApiError(409, '数据已被他人修改,请刷新后重试')
    return tx.contract.findFirst({ where: { id: contractId }, select: detailSelect })
  })

  await writeOpLog({ userId: user.id, module: 'contract', action: 'UPDATE', businessType: 'contract', businessId: contractId, detailJson: { name: updated?.name } })
  return ok(updated)
})

export const DELETE = withApi(async (_req, ctx) => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const contractId = Number(id)

  const existing = await prisma.contract.findFirst({ where: { id: contractId, isDeleted: false } })
  if (!existing || !contractInCompany(existing, companyId)) throw new ApiError(404, '合同不存在')
  assertCanOperateContract(user, existing)

  // 级联删除:软删该合同下所有资金记录与发票,硬删验收单据与附件记录(发票文件、验收单文件、原合同附件)
  await prisma.$transaction(async (tx) => {
    const [invoices, acceptances] = await Promise.all([
      tx.invoice.findMany({ where: { contractId, isDeleted: false }, select: { fileAttachmentId: true } }),
      tx.acceptanceDoc.findMany({ where: { contractId }, select: { attachmentId: true } }),
    ])
    const invoiceFileIds = invoices.map((i) => i.fileAttachmentId).filter((v): v is number => v != null)
    const acceptanceFileIds = acceptances.map((a) => a.attachmentId).filter((v): v is number => v != null)
    await tx.attachment.deleteMany({
      where: {
        OR: [
          ...(invoiceFileIds.length ? [{ id: { in: invoiceFileIds } }] : []),
          ...(acceptanceFileIds.length ? [{ id: { in: acceptanceFileIds } }] : []),
          { businessType: 'contract', businessId: contractId },
        ],
      },
    })
    await tx.acceptanceDoc.deleteMany({ where: { contractId } })
    const now = new Date()
    await tx.paymentRecord.updateMany({
      where: { contractId, isDeleted: false },
      data: { isDeleted: true, deletedAt: now, version: { increment: 1 } },
    })
    await tx.invoice.updateMany({
      where: { contractId, isDeleted: false },
      data: { isDeleted: true, deletedAt: now, version: { increment: 1 } },
    })
    await softDelete('contract', contractId, tx)
  })

  await writeOpLog({ userId: user.id, module: 'contract', action: 'DELETE', businessType: 'contract', businessId: contractId, detailJson: { name: existing.name } })
  return ok(null)
})
