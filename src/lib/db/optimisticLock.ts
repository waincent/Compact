import { prisma, type Prisma } from '@/lib/prisma'
import { ConflictError } from '@/lib/errors'

type Tx = Prisma.TransactionClient

/**
 * 乐观锁更新:要求 version 匹配,成功则 version+1
 * 返回 true 表示更新成功;返回 false 表示版本冲突或记录不存在
 */
export async function updateWithVersion(
  model: 'contract' | 'project' | 'paymentRecord' | 'invoice',
  id: number,
  version: number,
  data: Record<string, unknown>,
  tx: Tx = prisma,
): Promise<boolean> {
  const result = await (tx[model] as unknown as {
    updateMany: (args: {
      where: { id: number; version: number; isDeleted: boolean }
      data: Record<string, unknown> & { version: { increment: number } }
    }) => Promise<{ count: number }>
  }).updateMany({
    where: { id, version, isDeleted: false },
    data: { ...data, version: { increment: 1 } },
  })
  return result.count === 1
}

/** 乐观锁更新,冲突时抛 ConflictError */
export async function updateWithVersionOrThrow(
  model: 'contract' | 'project' | 'paymentRecord' | 'invoice',
  id: number,
  version: number,
  data: Record<string, unknown>,
  tx: Tx = prisma,
): Promise<void> {
  const ok = await updateWithVersion(model, id, version, data, tx)
  if (!ok) throw new ConflictError()
}
