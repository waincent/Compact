import fs from 'node:fs'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { withApi } from '@/lib/response'
import { ApiError } from '@/lib/errors'
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
