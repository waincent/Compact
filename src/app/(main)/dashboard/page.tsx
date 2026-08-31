import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { DashboardClient } from './dashboard-client'
import { getCurrentUser } from '@/lib/auth/session'
import { getRawCompanyId } from '@/lib/auth/company-context'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const companyId = await getRawCompanyId()

  return (
    <div>
      <PageHeader title="首页" description="项目、合同与财务概览" />
      <DashboardClient companyId={companyId} />
    </div>
  )
}
