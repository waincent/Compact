'use client'

import { Pencil, Power, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/data-table/status-badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { useDicts } from '@/hooks/use-dicts'
import type { Company } from '@/types/company'

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-20 shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 flex-1 break-words text-slate-700">{value ?? '-'}</span>
    </div>
  )
}

interface Props {
  company: Company | null
  canManage: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (company: Company) => void
  onToggleStatus: (company: Company) => void
  onDelete: (company: Company) => void
}

export function CompanyDetailDialog({
  company, canManage, onOpenChange, onEdit, onToggleStatus, onDelete,
}: Props) {
  const { getLabel } = useDicts(['company_status'])
  if (!company) return null

  return (
    <Dialog open={Boolean(company)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <span className="truncate">{company.name}</span>
            <StatusBadge value={company.status} label={getLabel('company_status', company.status)} />
          </DialogTitle>
          <DialogDescription>公司档案详情</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 rounded-lg border border-slate-100 p-4">
          <InfoRow label="社会信用代码" value={company.creditCode} />
          <InfoRow label="公司地址" value={company.address} />
          <InfoRow label="公司电话" value={company.phone} />
          <InfoRow label="联系人" value={company.contactName} />
          <InfoRow label="联系电话" value={company.contactPhone} />
          <InfoRow label="开户银行" value={company.bankName} />
          <InfoRow label="银行账号" value={company.bankAccount} />
          <InfoRow label="备注" value={company.remark} />
          <InfoRow label="创建人" value={company.createdByName} />
          <InfoRow
            label="创建时间"
            value={new Date(company.createdAt).toLocaleString('zh-CN', { hour12: false })}
          />
        </div>

        {canManage && (
          <DialogFooter className="gap-2 sm:justify-start">
            <Button variant="outline" onClick={() => onEdit(company)}>
              <Pencil className="h-4 w-4" /> 编辑
            </Button>
            <Button
              variant="outline"
              className={company.status === 1 ? 'text-amber-600' : 'text-green-600'}
              onClick={() => onToggleStatus(company)}
            >
              <Power className="h-4 w-4" /> {company.status === 1 ? '停用' : '启用'}
            </Button>
            <Button variant="destructive" onClick={() => onDelete(company)}>
              <Trash2 className="h-4 w-4" /> 删除
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
