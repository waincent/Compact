import type { Prisma } from '@/generated/prisma/client'
import type { SessionUser } from '@/lib/auth/session'
import { ForbiddenError } from '@/lib/errors'

/** 角色常量 */
export const ROLE = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  FINANCE: 3,
  MEMBER: 4,
} as const

/** 管理员角色(超管/管理员) */
export function isAdminRole(role: number): boolean {
  return role === ROLE.SUPER_ADMIN || role === ROLE.ADMIN
}

/** 公司:仅超管可写 */
export function canManageCompany(u: SessionUser): boolean {
  return u.role === ROLE.SUPER_ADMIN
}

/** 项目:超管/管理员可写;财务与普通成员仅查看 */
export function canManageProject(u: SessionUser): boolean {
  return isAdminRole(u.role)
}

/** 合同:超管/管理员可写;普通成员仅操作本人创建的 */
export function canManageContract(u: SessionUser, contract: { createdBy: number | null }): boolean {
  if (isAdminRole(u.role)) return true
  if (u.role === ROLE.MEMBER) return contract.createdBy === u.id
  return false
}

/** 付款:超管/财务可写 */
export function canManagePayment(u: SessionUser): boolean {
  return u.role === ROLE.SUPER_ADMIN || u.role === ROLE.FINANCE
}

/** 发票:超管/财务可写 */
export function canManageInvoice(u: SessionUser): boolean {
  return u.role === ROLE.SUPER_ADMIN || u.role === ROLE.FINANCE
}

/** 行级过滤:普通成员仅见自己创建的合同 */
export function contractScope(u: SessionUser): Prisma.ContractWhereInput {
  return u.role === ROLE.MEMBER ? { createdBy: u.id } : {}
}

/**
 * 按公司过滤合同:合同属于公司 X = 甲方或乙方任一为 X。
 * companyId 为 null 表示「全部」,不过滤。
 */
export function companyContractWhere(companyId: number | null): Prisma.ContractWhereInput {
  if (companyId == null) return {}
  return { OR: [{ partyAId: companyId }, { partyBId: companyId }] }
}

/** 按公司过滤项目:项目下存在任一合同属于该公司 */
export function companyProjectWhere(companyId: number | null): Prisma.ProjectWhereInput {
  if (companyId == null) return {}
  return { contracts: { some: { isDeleted: false, ...companyContractWhere(companyId) } } }
}

/**
 * 详情可见性:合同是否属于当前公司主体。
 * companyId 为 null(=全部)时恒通过。
 */
export function contractInCompany(
  contract: { partyAId: number; partyBId: number },
  companyId: number | null,
): boolean {
  if (companyId == null) return true
  return contract.partyAId === companyId || contract.partyBId === companyId
}

/** 断言可操作项目(仅管理员),否则抛 403 */
export function assertCanOperateProject(u: SessionUser): void {
  if (!canManageProject(u)) {
    throw new ForbiddenError('仅管理员可操作该项目')
  }
}

/** 断言可操作合同,否则抛 403 */
export function assertCanOperateContract(u: SessionUser, contract: { createdBy: number | null }): void {
  if (!canManageContract(u, contract)) {
    throw new ForbiddenError('仅合同创建人可操作该合同')
  }
}

/** 断言可管理付款/发票 */
export function assertCanManageFinance(u: SessionUser): void {
  if (!canManagePayment(u)) {
    throw new ForbiddenError('仅超级管理员或财务可执行该操作')
  }
}
