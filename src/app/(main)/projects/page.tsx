import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { ProjectsClient } from './projects-client'
import { getCurrentUser } from '@/lib/auth/session'
import { isAdminRole } from '@/lib/auth/authorize'
import { getRawCompanyId } from '@/lib/auth/company-context'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const companyId = await getRawCompanyId()

  return (
    <div>
      <PageHeader title="项目管理" description="项目立项、进度与状态管理" />
      <ProjectsClient canManage={isAdminRole(user.role)} companyId={companyId} />
    </div>
  )
}
