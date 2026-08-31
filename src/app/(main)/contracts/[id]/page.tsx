import { redirect } from 'next/navigation'
import { ContractDetail } from './contract-detail'
import { getCurrentUser } from '@/lib/auth/session'
import { isAdminRole, ROLE, canManagePayment, canManageInvoice } from '@/lib/auth/authorize'
import { getRawCompanyId } from '@/lib/auth/company-context'

export const dynamic = 'force-dynamic'

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { id } = await params
  const contractId = Number(id)
  if (!Number.isInteger(contractId)) redirect('/projects')
  const companyId = await getRawCompanyId()

  const canManage = isAdminRole(user.role)
  const canUpload = canManage || user.role === ROLE.FINANCE

  return (
    <ContractDetail
      contractId={contractId}
      companyId={companyId}
      canManage={canManage}
      canUpload={canUpload}
      canManagePayment={canManagePayment(user)}
      canManageInvoice={canManageInvoice(user)}
    />
  )
}
