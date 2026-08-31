import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'
import { saveUpload } from '@/lib/upload'

const querySchema = z.object({
  businessType: z.string().min(1).max(50),
  businessId: z.coerce.number().int().min(1),
})

/** 上传附件:multipart/form-data,字段 file;写入 attachment 记录 */
export const POST = withApi(async (req) => {
  const user = await requireUser()
  const url = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? '参数错误')

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) throw new ApiError(400, '请选择要上传的文件')

  const stored = await saveUpload(file)

  // 验收单文件:登记到验收单据的 attachmentId(已有文件则先删除旧的,单单据单文件)
  if (parsed.data.businessType === 'acceptance') {
    const doc = await prisma.acceptanceDoc.findFirst({
      where: { id: parsed.data.businessId },
    })
    if (!doc) throw new ApiError(404, '验收单据不存在')
    if (doc.attachmentId) {
      await prisma.attachment.delete({ where: { id: doc.attachmentId } }).catch(() => {})
    }
    const attachment = await prisma.attachment.create({
      data: {
        businessType: 'acceptance',
        businessId: doc.id,
        fileName: stored.fileName,
        filePath: stored.filePath,
        fileSize: stored.fileSize,
        mimeType: stored.mimeType,
        originalName: stored.originalName,
        createdBy: user.id,
      },
    })
    await prisma.acceptanceDoc.update({
      where: { id: doc.id },
      data: { attachmentId: attachment.id, version: { increment: 1 } },
    })
    return ok({
      id: attachment.id,
      originalName: stored.originalName,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
    })
  }

  // 发票文件:登记到发票的 fileAttachmentId(已有文件则先删除旧的,单发票单文件)
  if (parsed.data.businessType === 'invoice') {
    const invoice = await prisma.invoice.findFirst({
      where: { id: parsed.data.businessId, isDeleted: false },
    })
    if (!invoice) throw new ApiError(404, '发票不存在')
    if (invoice.fileAttachmentId) {
      await prisma.attachment.delete({ where: { id: invoice.fileAttachmentId } }).catch(() => {})
    }
    const attachment = await prisma.attachment.create({
      data: {
        businessType: 'invoice',
        businessId: invoice.id,
        fileName: stored.fileName,
        filePath: stored.filePath,
        fileSize: stored.fileSize,
        mimeType: stored.mimeType,
        originalName: stored.originalName,
        createdBy: user.id,
      },
    })
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { fileAttachmentId: attachment.id, version: { increment: 1 } },
    })
    return ok({
      id: attachment.id,
      originalName: stored.originalName,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
    })
  }

  const attachment = await prisma.attachment.create({
    data: {
      businessType: parsed.data.businessType,
      businessId: parsed.data.businessId,
      fileName: stored.fileName,
      filePath: stored.filePath,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
      originalName: stored.originalName,
      createdBy: user.id,
    },
  })

  return ok({
    id: attachment.id,
    originalName: stored.originalName,
    fileSize: stored.fileSize,
    mimeType: stored.mimeType,
  })
})
