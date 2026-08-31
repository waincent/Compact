import { getDicts } from '@/lib/dict'
import { requireUser } from '@/lib/auth/session'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'

/** 批量获取数据字典:?types=company_status,project_status,... */
export const GET = withApi(async (req) => {
  await requireUser()
  const url = new URL(req.url)
  const typesRaw = url.searchParams.get('types')
  if (!typesRaw) throw new ApiError(400, '缺少 types 参数')
  const types = typesRaw.split(',').map((t) => t.trim()).filter(Boolean)
  const dicts = await getDicts(types)
  return ok(dicts)
})
