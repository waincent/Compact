import { z } from 'zod'
import { prisma, type Prisma } from '@/lib/prisma'
import { requireUser, requireRole } from '@/lib/auth/session'
import { canManageCompany } from '@/lib/auth/authorize'
import { withApi, ok, okPage } from '@/lib/response'
import { ApiError, ForbiddenError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
  status: z.coerce.number().int().optional(),
})

export const GET = withApi(async (req) => {
  const user = await requireUser()
  const url = new URL(req.url)
  const params = listSchema.safeParse(Object.fromEntries(url.searchParams))
  const { page, pageSize, keyword, status } = params.success
    ? params.data
    : { page: 1, pageSize: 20, keyword: undefined, status: undefined }

  const where: Prisma.CompanyWhereInput = { isDeleted: false }
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: 'insensitive' } },
      { creditCode: { contains: keyword, mode: 'insensitive' } },
      { address: { contains: keyword, mode: 'insensitive' } },
      { contactName: { contains: keyword, mode: 'insensitive' } },
    ]
  }
  if (status !== undefined) where.status = status

  const [list, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { creator: { select: { name: true } } },
    }),
    prisma.company.count({ where }),
  ])

  return okPage(
    list.map((c) => ({ ...c, createdByName: c.creator?.name })),
    total,
    page,
    pageSize,
  )
})

const createSchema = z.object({
  name: z.string().min(1, '请输入公司全称').max(200),
  creditCode: z.string().max(50).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  contactName: z.string().max(50).optional().nullable(),
  contactPhone: z.string().max(20).optional().nullable(),
  bankName: z.string().max(100).optional().nullable(),
  bankAccount: z.string().max(50).optional().nullable(),
  remark: z.string().max(500).optional().nullable(),
})

export const POST = withApi(async (req) => {
  const user = await requireUser()
  if (!canManageCompany(user)) throw new ForbiddenError('仅超级管理员可新增公司')

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')

  const data = parsed.data
  const company = await prisma.company.create({
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
      createdBy: user.id,
    },
  })

  await writeOpLog({ userId: user.id, module: 'company', action: 'CREATE', businessType: 'company', businessId: company.id, detailJson: { name: company.name } })
  return ok(company)
})
