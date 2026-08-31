import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { CompaniesClient } from './companies-client'
import { getCurrentUser } from '@/lib/auth/session'
import { canManageCompany } from '@/lib/auth/authorize'

export const dynamic = 'force-dynamic'

export default async function CompaniesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div>
      <PageHeader title="公司管理" description="管理本公司及合作方公司档案" />
      <CompaniesClient canManage={canManageCompany(user)} />
    </div>
  )
}
