import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { DashboardClient } from './dashboard-client'
import { ProjectsClient } from '../projects/projects-client'
import { getCurrentUser } from '@/lib/auth/session'
import { isAdminRole } from '@/lib/auth/authorize'
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
      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">项目管理</h2>
        <ProjectsClient canManage={isAdminRole(user.role)} companyId={companyId} />
      </section>
    </div>
  )
}
