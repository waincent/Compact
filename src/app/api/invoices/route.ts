import { z } from 'zod'
import { prisma, type Prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/session'
import { ROLE, companyContractWhere } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok, okPage } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'
import { toNumber, assertContractAmount, calcFromGross } from '@/lib/money'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  contractId: z.coerce.number().int().optional(),
  keyword: z.string().optional(),
})

const invoiceListSelect = {
  id: true, contractId: true,
  invoiceCode: true, invoiceNumber: true, amount: true, taxRate: true,
  taxAmount: true, totalAmountWithTax: true, issueDate: true,
  version: true, createdAt: true,
  contract: { select: { id: true, code: true, name: true, totalAmount: true } },
  creator: { select: { name: true } },
} satisfies Prisma.InvoiceSelect

export const GET = withApi(async (req) => {
  const user = await requireRole([ROLE.SUPER_ADMIN, ROLE.FINANCE, ROLE.ADMIN])
  const { companyId } = await resolveCompanyContext(user)
  const url = new URL(req.url)
  const params = listSchema.safeParse(Object.fromEntries(url.searchParams))
  const { page, pageSize, contractId, keyword } = params.success
    ? params.data
    : { page: 1, pageSize: 20, contractId: undefined, keyword: undefined }

  const where: Prisma.InvoiceWhereInput = { isDeleted: false }
  const companyWhere = companyContractWhere(companyId)
  if (Object.keys(companyWhere).length > 0) where.contract = companyWhere
  if (contractId) where.contractId = contractId
  if (keyword) {
    where.OR = [
      { invoiceNumber: { contains: keyword, mode: 'insensitive' } },
      { invoiceCode: { contains: keyword, mode: 'insensitive' } },
      { contract: { name: { contains: keyword, mode: 'insensitive' } } },
    ]
  }

  const [list, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: invoiceListSelect,
    }),
    prisma.invoice.count({ where }),
  ])

  return okPage(
    list.map((i) => ({
      id: i.id,
      contractId: i.contractId,
      contractCode: i.contract.code,
      contractName: i.contract.name,
      invoiceCode: i.invoiceCode,
      invoiceNumber: i.invoiceNumber,
      amount: Number(i.amount),
      taxRate: Number(i.taxRate),
      taxAmount: Number(i.taxAmount),
      totalAmountWithTax: Number(i.totalAmountWithTax),
      issueDate: i.issueDate,
      version: i.version,
      createdByName: i.creator?.name,
    })),
    total,
    page,
    pageSize,
  )
})

const createSchema = z.object({
  contractId: z.coerce.number().int().min(1, '请选择合同'),
  invoiceCode: z.string().max(30).optional().nullable(),
  invoiceNumber: z.string().min(1, '请输入发票号码').max(30),
  totalAmountWithTax: z.coerce.number().min(0.01, '含税金额需大于 0'),
  taxRate: z.coerce.number().min(0).max(100).default(13),
  issueDate: z.string().min(1, '请选择开票日期'),
  remark: z.string().max(300).optional().nullable(),
})

export const POST = withApi(async (req) => {
  const user = await requireRole([ROLE.SUPER_ADMIN, ROLE.FINANCE])

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')
  const data = parsed.data
  const totalWithTax = toNumber(data.totalAmountWithTax)
  const taxRate = data.taxRate
  const { amount, tax } = calcFromGross(totalWithTax, taxRate)

  const contract = await prisma.contract.findFirst({ where: { id: data.contractId, isDeleted: false } })
  if (!contract) throw new ApiError(404, '合同不存在')
  const contractTotal = toNumber(contract.totalAmount)

  // 合同累计开票(仅正数发票) + 本次价税合计 ≤ 合同总额
  const agg = await prisma.invoice.aggregate({
    where: {
      contractId: contract.id,
      isDeleted: false,
      amount: { gt: 0 },
    },
    _sum: { totalAmountWithTax: true },
  })
  const invoicedSum = toNumber(agg._sum.totalAmountWithTax)
  assertContractAmount({ contractTotal, sameDirectionSum: invoicedSum, incoming: totalWithTax })

  const invoice = await prisma.invoice.create({
    data: {
      contractId: contract.id,
      invoiceCode: data.invoiceCode ?? null,
      invoiceNumber: data.invoiceNumber,
      amount,
      taxRate,
      taxAmount: tax,
      totalAmountWithTax: totalWithTax,
      issueDate: new Date(data.issueDate),
      remark: data.remark ?? null,
      createdBy: user.id,
    },
    select: { id: true, invoiceNumber: true, totalAmountWithTax: true },
  })

  await writeOpLog({ userId: user.id, module: 'invoice', action: 'CREATE', businessType: 'invoice', businessId: invoice.id, detailJson: { contractId: contract.id, invoiceNumber: invoice.invoiceNumber, totalWithTax } })
  return ok(invoice)
})
