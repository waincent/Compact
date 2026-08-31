import { z } from 'zod'
import { prisma, type Prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { isAdminRole, companyContractWhere } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok, okPage } from '@/lib/response'
import { ApiError, ForbiddenError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'
import { nextProjectCode } from '@/lib/sequence'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
  status: z.coerce.number().int().min(1).max(2).optional(),
})

const projectSelect = {
  id: true, code: true, name: true, description: true, status: true,
  startDate: true, endDate: true, version: true, createdAt: true,
  creator: { select: { name: true } },
  _count: { select: { contracts: { where: { isDeleted: false } } } },
} satisfies Prisma.ProjectSelect

export const GET = withApi(async (req) => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const url = new URL(req.url)
  const params = listSchema.safeParse(Object.fromEntries(url.searchParams))
  const { page, pageSize, keyword, status } = params.success
    ? params.data
    : { page: 1, pageSize: 20, keyword: undefined, status: undefined }

  const where: Prisma.ProjectWhereInput = {
    isDeleted: false,
  }
  if (companyId != null) {
    // 项目归属 = 项目下存在合同属于该公司(甲方或乙方任一)
    where.contracts = { some: { isDeleted: false, ...companyContractWhere(companyId) } }
  }
  if (keyword) where.name = { contains: keyword, mode: 'insensitive' }
  if (status) where.status = status

  const [list, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: projectSelect,
    }),
    prisma.project.count({ where }),
  ])

  return okPage(list, total, page, pageSize)
})

const createSchema = z.object({
  name: z.string().min(1, '请输入项目名称').max(200),
  description: z.string().max(500).optional().nullable(),
  status: z.coerce.number().int().min(1).max(2).default(1),
  startDate: z.string().min(1, '请选择开始日期'),
  endDate: z.string().min(1, '请选择结束日期'),
})

export const POST = withApi(async (req) => {
  const user = await requireUser()
  if (!isAdminRole(user.role)) throw new ForbiddenError('仅管理员可创建项目')

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')
  const data = parsed.data

  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  if (end < start) throw new ApiError(400, '结束日期不能早于开始日期')

  const code = await nextProjectCode(start.getFullYear())

  const project = await prisma.project.create({
    data: {
      code,
      name: data.name,
      description: data.description ?? null,
      status: data.status,
      startDate: start,
      endDate: end,
      createdBy: user.id,
    },
    select: projectSelect,
  })

  await writeOpLog({ userId: user.id, module: 'project', action: 'CREATE', businessType: 'project', businessId: project.id, detailJson: { code, name: project.name } })
  return ok(project)
})
