import { redirect } from 'next/navigation'
import { ProjectDetail } from './project-detail'
import { getCurrentUser } from '@/lib/auth/session'
import { isAdminRole } from '@/lib/auth/authorize'
import { getRawCompanyId } from '@/lib/auth/company-context'

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { id } = await params
  const projectId = Number(id)
  if (!Number.isInteger(projectId)) redirect('/projects')
  const companyId = await getRawCompanyId()

  return <ProjectDetail projectId={projectId} canManage={isAdminRole(user.role)} companyId={companyId} />
}
