import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma, type Prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/session'
import { ROLE } from '@/lib/auth/authorize'
import { withApi, ok } from '@/lib/response'
import { ApiError, ForbiddenError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'

const userSelect = {
  id: true, username: true, name: true, email: true, phone: true,
  role: true, companyId: true, status: true, mustChangePassword: true,
  lastLoginAt: true, lastLoginIp: true, createdAt: true,
  company: { select: { name: true } },
} satisfies Prisma.UserSelect

const updateSchema = z.object({
  name: z.string().min(1, '请输入姓名').max(50).optional(),
  email: z.string().email('邮箱格式不正确').optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  role: z.coerce.number().int().min(1).max(4).optional(),
  companyId: z.coerce.number().int().min(1, '请选择所属公司').optional(),
  status: z.coerce.number().int().min(0).max(1).optional(),
  password: z.string().min(6, '新密码至少 6 位').max(50).optional(),
})

export const GET = withApi(async (_req, ctx) => {
  await requireRole([ROLE.SUPER_ADMIN])
  const { id } = await ctx.params
  const target = await prisma.user.findUnique({ where: { id: Number(id) }, select: userSelect })
  if (!target) throw new ApiError(404, '用户不存在')
  return ok({ ...target, companyName: target.company?.name ?? null, company: undefined })
})

export const PUT = withApi(async (req, ctx) => {
  const user = await requireRole([ROLE.SUPER_ADMIN])
  const { id } = await ctx.params
  const userId = Number(id)

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) throw new ApiError(404, '用户不存在')
  if (target.username === 'admin' && parsed.data.status === 0) {
    throw new ApiError(400, '不能停用内置超管账号 admin')
  }
  if (target.username === 'admin' && parsed.data.role !== undefined && parsed.data.role !== ROLE.SUPER_ADMIN) {
    throw new ApiError(400, '不能修改内置超管账号 admin 的角色')
  }
  if (target.username === 'admin' && parsed.data.companyId !== undefined) {
    throw new ApiError(400, 'admin 为平台超管账号,不归属任何公司')
  }

  const data = parsed.data
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.companyId !== undefined ? { companyId: data.companyId } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10), mustChangePassword: true } : {}),
    },
    select: userSelect,
  })

  await writeOpLog({
    userId: user.id, module: 'user', action: data.password ? 'RESET_PASSWORD' : 'UPDATE',
    businessType: 'user', businessId: userId,
    detailJson: { username: target.username, role: updated.role, status: updated.status },
  })
  return ok({ ...updated, companyName: updated.company?.name ?? null, company: undefined })
})

export const DELETE = withApi(async (_req, ctx) => {
  const user = await requireRole([ROLE.SUPER_ADMIN])
  const { id } = await ctx.params
  const userId = Number(id)

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) throw new ApiError(404, '用户不存在')
  if (target.username === 'admin') throw new ApiError(400, '不能删除内置超管账号 admin')
  if (userId === user.id) throw new ApiError(400, '不能删除当前登录账号')

  // 用户无软删除字段,直接物理删除(登录日志等关联字段级联)
  await prisma.user.delete({ where: { id: userId } })
  await writeOpLog({ userId: user.id, module: 'user', action: 'DELETE', businessType: 'user', businessId: userId, detailJson: { username: target.username } })
  return ok(null)
})
