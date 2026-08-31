import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma, type Prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/session'
import { ROLE } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok, okPage } from '@/lib/response'
import { ApiError, ForbiddenError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
  role: z.coerce.number().int().min(1).max(4).optional(),
  status: z.coerce.number().int().min(0).max(1).optional(),
})

const userSelect = {
  id: true, username: true, name: true, email: true, phone: true,
  role: true, companyId: true, status: true, mustChangePassword: true,
  lastLoginAt: true, lastLoginIp: true, createdAt: true,
  company: { select: { name: true } },
} satisfies Prisma.UserSelect

export const GET = withApi(async (req) => {
  const user = await requireRole([ROLE.SUPER_ADMIN])
  const url = new URL(req.url)
  const params = listSchema.safeParse(Object.fromEntries(url.searchParams))
  const { page, pageSize, keyword, role, status } = params.success
    ? params.data
    : { page: 1, pageSize: 20, keyword: undefined, role: undefined, status: undefined }

  const where: Prisma.UserWhereInput = {}
  const { companyId } = await resolveCompanyContext(user)
  if (companyId != null) where.companyId = companyId
  if (keyword) {
    where.OR = [
      { username: { contains: keyword, mode: 'insensitive' } },
      { name: { contains: keyword, mode: 'insensitive' } },
    ]
  }
  if (role) where.role = role
  if (status !== undefined) where.status = status

  const [list, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: userSelect,
    }),
    prisma.user.count({ where }),
  ])

  void user
  const rows = list.map((u) => ({ ...u, companyName: u.company?.name ?? null, company: undefined }))
  return okPage(rows, total, page, pageSize)
})

const createSchema = z.object({
  username: z.string().min(2, '用户名至少 2 个字符').max(50).regex(/^[a-zA-Z0-9_]+$/, '用户名仅支持字母/数字/下划线'),
  name: z.string().min(1, '请输入姓名').max(50),
  email: z.string().email('邮箱格式不正确').optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  role: z.coerce.number().int().min(1).max(4),
  companyId: z.coerce.number().int().min(1, '请选择所属公司'),
  password: z.string().min(6, '初始密码至少 6 位').max(50),
})

export const POST = withApi(async (req) => {
  const user = await requireRole([ROLE.SUPER_ADMIN])

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')

  const data = parsed.data
  const passwordHash = await bcrypt.hash(data.password, 10)

  const created = await prisma.user.create({
    data: {
      username: data.username,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      role: data.role,
      companyId: data.companyId,
      passwordHash,
      mustChangePassword: true,
    },
    select: userSelect,
  })

  await writeOpLog({ userId: user.id, module: 'user', action: 'CREATE', businessType: 'user', businessId: created.id, detailJson: { username: created.username, role: created.role } })
  return ok({ ...created, companyName: created.company?.name ?? null, company: undefined })
})
