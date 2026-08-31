import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { UsersClient } from './users-client'
import { getCurrentUser } from '@/lib/auth/session'
import { ROLE } from '@/lib/auth/authorize'
import { getRawCompanyId } from '@/lib/auth/company-context'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== ROLE.SUPER_ADMIN) redirect('/dashboard')
  const companyId = await getRawCompanyId()

  return (
    <div>
      <PageHeader title="用户管理" description="管理系统用户账号与角色" />
      <UsersClient companyId={companyId} />
    </div>
  )
}
