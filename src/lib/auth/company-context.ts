import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/lib/auth/session'
import { ROLE } from '@/lib/auth/authorize'

/** 公司主体选择的 cookie 名(普通 cookie,path=/,由顶栏写入) */
export const COMPANY_COOKIE = 'company_id'

/**
 * 读取当前公司选择(不校验,供服务端页面作为 prop 传给客户端数据组件做重取信号)。
 * 返回 null 表示「全部」。
 */
export async function getRawCompanyId(): Promise<number | null> {
  const store = await cookies()
  const raw = store.get(COMPANY_COOKIE)?.value
  const cid = raw ? Number(raw) : null
  return cid != null && Number.isInteger(cid) && cid > 0 ? cid : null
}

/**
 * 解析当前用户的公司上下文(服务端权威,含越权防护):
 * - 非超管:只能选自己所属公司(cookie 不符则回退到自己公司)。
 * - 超管:可选任一启用公司或「全部」;cookie 指向已删除/停用的公司时回退「全部」。
 * 返回 companyId:number|null,null = 不过滤(全部)。
 */
export async function resolveCompanyContext(user: SessionUser): Promise<{ companyId: number | null }> {
  const raw = await getRawCompanyId()

  // 非超管:公司归属由账号决定,与 cookie 无关(强制回退)
  if (user.role !== ROLE.SUPER_ADMIN) {
    return { companyId: user.companyId }
  }

  // 超管:cookie 无值或非法 → 全部
  if (raw == null) return { companyId: null }

  // 超管选中的公司必须存在且启用
  const company = await prisma.company.findFirst({
    where: { id: raw, isDeleted: false, status: 1 },
    select: { id: true },
  })
  return { companyId: company ? company.id : null }
}
