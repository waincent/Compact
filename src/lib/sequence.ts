import { prisma, type Prisma } from '@/lib/prisma'

type Tx = Prisma.TransactionClient

/**
 * 生成业务编号:前缀-年份-三位序号(如 XM-2026-008)
 * 基于 sys_sequence 表 upsert 原子自增,并发安全
 */
export async function nextCode(prefix: string, year: number, tx: Tx = prisma): Promise<string> {
  const bizKey = `${prefix}-${year}`
  const row = await tx.sequence.upsert({
    where: { bizKey },
    update: { seq: { increment: 1 } },
    create: { bizKey, seq: 1 },
  })
  return `${bizKey}-${String(row.seq).padStart(3, '0')}`
}

/** 项目编号 */
export function nextProjectCode(year: number, tx?: Tx) {
  return nextCode('XM', year, tx)
}

/** 合同编号 */
export function nextContractCode(year: number, tx?: Tx) {
  return nextCode('HT', year, tx)
}
