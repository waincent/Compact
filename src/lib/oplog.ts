import { prisma } from '@/lib/prisma'

export interface OpLogInput {
  userId: number
  module: string
  action: string
  businessType?: string
  businessId?: number
  detailJson?: unknown
  ip?: string
}

/** 写入操作日志(异步 fire-and-forget,不阻塞主流程) */
export async function writeOpLog(input: OpLogInput): Promise<void> {
  try {
    await prisma.operationLog.create({
      data: {
        userId: input.userId,
        module: input.module,
        action: input.action,
        businessType: input.businessType,
        businessId: input.businessId,
        detailJson: input.detailJson ? JSON.stringify(input.detailJson) : null,
        ip: input.ip,
      },
    })
  } catch (err) {
    console.error('[OPLOG] write failed', err)
  }
}
