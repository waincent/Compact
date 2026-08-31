import { z } from 'zod'
import { prisma, type Prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/session'
import { ROLE, companyContractWhere } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok, okPage } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'
import { toNumber, assertContractAmount } from '@/lib/money'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  contractId: z.coerce.number().int().optional(),
  keyword: z.string().optional(),
})

const paymentListSelect = {
  id: true, contractId: true, amount: true,
  recordDate: true, version: true, createdAt: true, voucherAttachmentId: true,
  contract: {
    select: { id: true, code: true, name: true, totalAmount: true, contractType: true },
  },
  creator: { select: { name: true } },
} satisfies Prisma.PaymentRecordSelect

export const GET = withApi(async (req) => {
  const user = await requireRole([ROLE.SUPER_ADMIN, ROLE.FINANCE, ROLE.ADMIN])
  const { companyId } = await resolveCompanyContext(user)
  const url = new URL(req.url)
  const params = listSchema.safeParse(Object.fromEntries(url.searchParams))
  const { page, pageSize, contractId, keyword } = params.success
    ? params.data
    : { page: 1, pageSize: 20, contractId: undefined, keyword: undefined }

  const where: Prisma.PaymentRecordWhereInput = { isDeleted: false }
  const companyWhere = companyContractWhere(companyId)
  if (contractId) where.contractId = contractId
  if (keyword) {
    where.contract = { ...companyWhere, name: { contains: keyword, mode: 'insensitive' } }
  } else if (Object.keys(companyWhere).length > 0) {
    where.contract = companyWhere
  }

  const [list, total] = await Promise.all([
    prisma.paymentRecord.findMany({
      where,
      orderBy: { recordDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: paymentListSelect,
    }),
    prisma.paymentRecord.count({ where }),
  ])

  return okPage(
    list.map((p) => ({
      id: p.id,
      contractId: p.contractId,
      contractCode: p.contract.code,
      contractName: p.contract.name,
      contractTotal: Number(p.contract.totalAmount),
      /** 收款/付款由合同类型推导:销售=收款、采购=付款 */
      contractType: p.contract.contractType,
      amount: Number(p.amount),
      recordDate: p.recordDate,
      version: p.version,
      createdByName: p.creator?.name,
    })),
    total,
    page,
    pageSize,
  )
})

const createSchema = z.object({
  contractId: z.coerce.number().int().min(1, '请选择合同'),
  amount: z.coerce.number().min(0.01, '金额需大于 0'),
  recordDate: z.string().min(1, '请选择发生日期'),
  voucherAttachmentId: z.coerce.number().int().optional().nullable(),
})

export const POST = withApi(async (req) => {
  const user = await requireRole([ROLE.SUPER_ADMIN, ROLE.FINANCE])

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')
  const data = parsed.data
  const amount = toNumber(data.amount)

  const contract = await prisma.contract.findFirst({ where: { id: data.contractId, isDeleted: false } })
  if (!contract) throw new ApiError(404, '合同不存在')
  const contractTotal = toNumber(contract.totalAmount)
  // 收款/付款由合同类型推导:销售=收款、采购=付款(合同下方向必然一致,累计不再区分)
  const derivedDirection = contract.contractType

  // 合同累计资金 + 本次 ≤ 合同总额
  const agg = await prisma.paymentRecord.aggregate({
    where: { contractId: contract.id, isDeleted: false },
    _sum: { amount: true },
  })
  const sameDirectionSum = toNumber(agg._sum.amount)
  assertContractAmount({ contractTotal, sameDirectionSum, incoming: amount })

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.paymentRecord.create({
      data: {
        contractId: contract.id,
        amount,
        recordDate: new Date(data.recordDate),
        voucherAttachmentId: data.voucherAttachmentId ?? null,
        createdBy: user.id,
      },
    })
    // 乐观锁更新合同 version
    const locked = await tx.contract.updateMany({
      where: { id: contract.id, version: contract.version, isDeleted: false },
      data: { version: { increment: 1 } },
    })
    if (locked.count !== 1) {
      throw new ApiError(409, '合同数据已被他人修改,请刷新后重试')
    }
    return created
  })

  await writeOpLog({ userId: user.id, module: 'payment', action: 'CREATE', businessType: 'payment', businessId: payment.id, detailJson: { contractId: contract.id, derivedDirection, amount } })
  return ok({ id: payment.id })
})
