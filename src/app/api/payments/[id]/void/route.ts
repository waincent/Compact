import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/session'
import { ROLE, contractInCompany } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'

/** 作废资金记录:待确认 → 已作废(不影响累计) */
export const POST = withApi(async (_req, ctx) => {
  const user = await requireRole([ROLE.SUPER_ADMIN, ROLE.FINANCE])
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const paymentId = Number(id)

  const payment = await prisma.paymentRecord.findFirst({
    where: { id: paymentId, isDeleted: false },
    include: { contract: { select: { partyAId: true, partyBId: true } } },
  })
  if (!payment || !contractInCompany(payment.contract, companyId)) throw new ApiError(404, '资金记录不存在')
  if (payment.status !== 1) throw new ApiError(400, '仅待确认的记录可作废')

  const updated = await prisma.paymentRecord.update({
    where: { id: paymentId },
    data: { status: 3, version: { increment: 1 } },
    select: { id: true, status: true },
  })

  await writeOpLog({ userId: user.id, module: 'payment', action: 'VOID', businessType: 'payment', businessId: paymentId, detailJson: { amount: Number(payment.amount) } })
  return ok(updated)
})
