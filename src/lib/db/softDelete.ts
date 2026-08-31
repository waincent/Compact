import { prisma, type Prisma } from '@/lib/prisma'

type Tx = Prisma.TransactionClient

const SOFT_DELETE_MODELS = [
  'company', 'project', 'contract', 'paymentRecord', 'invoice',
] as const

/** 软删除:置 isDeleted=true + deletedAt,幂等(已删返回 false) */
export async function softDelete(
  model: (typeof SOFT_DELETE_MODELS)[number],
  id: number,
  tx: Tx = prisma,
): Promise<boolean> {
  const result = await (tx[model] as unknown as {
    updateMany: (args: {
      where: { id: number; isDeleted: boolean }
      data: { isDeleted: boolean; deletedAt: Date; version: { increment: number } }
    }) => Promise<{ count: number }>
  }).updateMany({
    where: { id, isDeleted: false },
    data: { isDeleted: true, deletedAt: new Date(), version: { increment: 1 } },
  })
  return result.count === 1
}

/** 按 id 读取未删除记录 */
export async function findActive<T extends { id: number; isDeleted: boolean }>(
  model: (typeof SOFT_DELETE_MODELS)[number],
  id: number,
  tx: Tx = prisma,
): Promise<T | null> {
  return (tx[model] as unknown as {
    findFirst: (args: { where: { id: number; isDeleted: boolean } }) => Promise<T | null>
  }).findFirst({ where: { id, isDeleted: false } })
}
