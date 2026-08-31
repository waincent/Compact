import { prisma, type Prisma } from '@/lib/prisma'

type Tx = Prisma.TransactionClient

export interface DictItem {
  label: string
  value: string
  dictType: string
  sortOrder: number
}

/** 按类型取数据字典(启用中的) */
export async function getDict(type: string, tx: Tx = prisma): Promise<DictItem[]> {
  const rows = await tx.sysDict.findMany({
    where: { dictType: type, status: 1 },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  return rows.map((r) => ({
    label: r.dictLabel,
    value: r.dictValue,
    dictType: r.dictType,
    sortOrder: r.sortOrder,
  }))
}

/** 批量取多个类型的字典,返回 { type: items[] } */
export async function getDicts(types: string[], tx: Tx = prisma): Promise<Record<string, DictItem[]>> {
  const rows = await tx.sysDict.findMany({
    where: { dictType: { in: types }, status: 1 },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  const result: Record<string, DictItem[]> = {}
  for (const type of types) result[type] = []
  for (const r of rows) {
    result[r.dictType] = result[r.dictType] ?? []
    result[r.dictType].push({
      label: r.dictLabel,
      value: r.dictValue,
      dictType: r.dictType,
      sortOrder: r.sortOrder,
    })
  }
  return result
}

/** 单个值取标签 */
export async function getDictLabel(type: string, value: number | string | null, tx: Tx = prisma): Promise<string> {
  if (value == null) return '-'
  const item = await tx.sysDict.findFirst({
    where: { dictType: type, dictValue: String(value), status: 1 },
  })
  return item?.dictLabel ?? String(value)
}
