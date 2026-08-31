import fs from 'node:fs'
import { prisma } from '@/lib/prisma'
import { requireUser, requireRole } from '@/lib/auth/session'
import { contractInCompany, ROLE } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { writeOpLog } from '@/lib/oplog'
import { resolveUploadPath } from '@/lib/upload'

/** 下载/预览附件(鉴权) */
export const GET = withApi(async (_req, ctx) => {
  await requireUser()
  const { id } = await ctx.params
  const attachment = await prisma.attachment.findUnique({ where: { id: Number(id) } })
  if (!attachment) throw new ApiError(404, '附件不存在')

  let abs: string
  try {
    abs = await resolveUploadPath(attachment.filePath)
  } catch {
    throw new ApiError(404, '附件文件不存在')
  }

  const data = await fs.promises.readFile(abs)
  const isImage = attachment.mimeType.startsWith('image/')
  const isPdf = attachment.mimeType === 'application/pdf'

  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': attachment.mimeType,
      'Content-Length': String(attachment.fileSize),
      'Cache-Control': isImage || isPdf ? 'public, max-age=3600' : 'no-store',
      ...(isImage || isPdf
        ? { 'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.originalName)}"` }
        : { 'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.originalName)}"` }),
    },
  })
})

/** 删除合同原件附件(仅管理员/财务;硬删记录,磁盘文件不清理) */
export const DELETE = withApi(async (_req, ctx) => {
  const user = await requireRole([ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.FINANCE])
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const attachmentId = Number(id)

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } })
  if (!attachment || attachment.businessType !== 'contract') throw new ApiError(404, '文件不存在')
  const contract = await prisma.contract.findFirst({ where: { id: attachment.businessId, isDeleted: false } })
  if (!contract || !contractInCompany(contract, companyId)) throw new ApiError(404, '合同不存在')

  await prisma.attachment.delete({ where: { id: attachment.id } }).catch(() => {})
  await writeOpLog({ userId: user.id, module: 'contract', action: 'DELETE_CONTRACT_FILE', businessType: 'contract', businessId: contract.id, detailJson: { name: contract.name, file: attachment.originalName } })
  return ok(null)
})
