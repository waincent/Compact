import { z } from 'zod'
import { prisma, type Prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { isAdminRole, contractScope, companyContractWhere } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok, okPage } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'
import { nextContractCode } from '@/lib/sequence'
import { toNumber } from '@/lib/money'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
  projectId: z.coerce.number().int().optional(),
})

const contractListSelect = {
  id: true, code: true, name: true, projectId: true, totalAmount: true,
  signDate: true, startDate: true, endDate: true,
  contractType: true, version: true, createdAt: true,
  project: { select: { id: true, name: true, code: true } },
  partyA: { select: { id: true, name: true } },
  partyB: { select: { id: true, name: true } },
  creator: { select: { id: true, name: true, username: true } },
} satisfies Prisma.ContractSelect

export const GET = withApi(async (req) => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const url = new URL(req.url)
  const params = listSchema.safeParse(Object.fromEntries(url.searchParams))
  const { page, pageSize, keyword, projectId } = params.success
    ? params.data
    : { page: 1, pageSize: 20, keyword: undefined, projectId: undefined }

  const where: Prisma.ContractWhereInput = {
    ...contractScope(user),
    ...companyContractWhere(companyId),
    isDeleted: false,
  }
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: 'insensitive' } },
      { code: { contains: keyword, mode: 'insensitive' } },
    ]
  }
  if (projectId) where.projectId = projectId

  const [list, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: contractListSelect,
    }),
    prisma.contract.count({ where }),
  ])

  return okPage(list, total, page, pageSize)
})

const createSchema = z.object({
  name: z.string().min(1, '请输入合同名称').max(200),
  projectId: z.coerce.number().int().min(1, '请选择所属项目'),
  partyAId: z.coerce.number().int().min(1, '请选择甲方公司'),
  partyBId: z.coerce.number().int().min(1, '请选择乙方公司'),
  contractType: z.coerce.number().int().min(1).max(2),
  totalAmount: z.coerce.number().min(0.01, '合同金额需大于 0'),
  signDate: z.string().min(1, '请选择签订日期'),
  startDate: z.string().min(1, '请选择开始日期'),
  endDate: z.string().min(1, '请选择结束日期'),
})

export const POST = withApi(async (req) => {
  const user = await requireUser()
  if (!isAdminRole(user.role)) throw new ApiError(403, '仅管理员可创建合同')

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')
  const data = parsed.data

  if (data.partyAId === data.partyBId) throw new ApiError(400, '甲方与乙方不能是同一家公司')

  const project = await prisma.project.findFirst({ where: { id: data.projectId, isDeleted: false } })
  if (!project) throw new ApiError(400, '所属项目不存在')

  const [partyA, partyB] = await Promise.all([
    prisma.company.findFirst({ where: { id: data.partyAId, isDeleted: false } }),
    prisma.company.findFirst({ where: { id: data.partyBId, isDeleted: false } }),
  ])
  if (!partyA || !partyB) throw new ApiError(400, '合同方公司不存在')

  const sign = new Date(data.signDate)
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  if (end < start) throw new ApiError(400, '合同结束日期不能早于开始日期')

  const code = await nextContractCode(sign.getFullYear())

  const contract = await prisma.contract.create({
    data: {
      code,
      name: data.name,
      projectId: data.projectId,
      partyAId: data.partyAId,
      partyBId: data.partyBId,
      contractType: data.contractType,
      totalAmount: toNumber(data.totalAmount),
      signDate: sign,
      startDate: start,
      endDate: end,
      createdBy: user.id,
    },
    select: contractListSelect,
  })

  await writeOpLog({ userId: user.id, module: 'contract', action: 'CREATE', businessType: 'contract', businessId: contract.id, detailJson: { code, name: contract.name, totalAmount: data.totalAmount } })
  return ok(contract)
})
