import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { ApiError } from '@/lib/errors'

export const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export interface StoredFile {
  fileName: string // 磁盘文件名(随机 uuid)
  filePath: string // 相对路径,如 2026/08/31/uuid.pdf
  fileSize: number
  mimeType: string
  originalName: string
}

function extOf(mime: string, originalName: string): string {
  const fallback = path.extname(originalName).replace('.', '') || 'bin'
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  }
  return map[mime] ?? fallback
}

/** 校验并保存上传文件到本地磁盘,返回元数据 */
export async function saveUpload(file: File): Promise<StoredFile> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new ApiError(400, '不支持的文件类型,仅支持图片/PDF/Word/Excel')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new ApiError(400, '文件大小不能超过 20MB')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const ext = extOf(file.type, file.name)
  const diskName = `${randomUUID()}.${ext}`
  const relPath = `${yyyy}/${mm}/${dd}/${diskName}`

  const root = process.env.UPLOAD_DIR ?? './uploads'
  // UPLOAD_DIR 可能是相对(cwd 下)或绝对路径(容器内挂载点),统一解析到基准目录
  const base = path.isAbsolute(root) ? root : path.join(process.cwd(), root)
  const absDir = path.join(base, `${yyyy}/${mm}/${dd}`)
  await fs.mkdir(absDir, { recursive: true })
  await fs.writeFile(path.join(absDir, diskName), buffer)

  return {
    fileName: diskName,
    filePath: relPath,
    fileSize: file.size,
    mimeType: file.type,
    originalName: file.name,
  }
}

/** 读取磁盘文件的绝对路径(校验路径安全,防路径穿越) */
export async function resolveUploadPath(relPath: string): Promise<string> {
  const root = process.env.UPLOAD_DIR ?? './uploads'
  // 与 saveUpload 一致:UPLOAD_DIR 可能是相对或绝对路径,统一解析到基准目录
  const base = path.isAbsolute(root) ? root : path.join(/*turbopackIgnore: true*/ process.cwd(), root)
  const abs = path.join(/*turbopackIgnore: true*/ base, relPath)
  const normalizedRoot = path.resolve(/*turbopackIgnore: true*/ base)
  if (!abs.startsWith(normalizedRoot + path.sep)) {
    throw new ApiError(400, '非法文件路径')
  }
  await fs.access(abs)
  return abs
}
