'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/data-table/status-badge'
import { EmptyState } from '@/components/data-table/empty-state'
import { ConfirmDialog } from '@/components/data-table/confirm-dialog'
import { ProjectFormDialog } from '../project-form-dialog'
import { ContractFormDialog } from '../../contracts/contract-form-dialog'
import { useDicts } from '@/hooks/use-dicts'
import { api } from '@/lib/api-client'
import { toDateStr, cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'

interface ProjectDetail {
  id: number; code: string; name: string; description: string | null
  status: number; startDate: string; endDate: string
  version: number; createdAt: string
  creator?: { name: string } | null
  _count?: { contracts: number }
  summary?: {
    salesContractTotal: number
    purchaseContractTotal: number
    invoiceOut: number
    invoiceIn: number
  }
}

interface ContractRow {
  id: number; code: string; name: string
  contractType: number; totalAmount: number; signDate: string
  partyA?: { name: string }
  partyB?: { name: string }
}

export function ProjectDetail({ projectId, canManage, companyId }: { projectId: number; canManage: boolean; companyId: number | null }) {
  const router = useRouter()
  const { getLabel } = useDicts(['project_status', 'contract_type'])
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [contractFormOpen, setContractFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([
        api.get<ProjectDetail>(`/api/projects/${projectId}`),
        api.get<{ list: ContractRow[] }>(`/api/contracts?projectId=${projectId}&pageSize=100`),
      ])
      setProject(p)
      setContracts(c.list)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [projectId, companyId])

  useEffect(() => {
    load()
  }, [load])

  async function onDelete() {
    if (!project) return
    setDeleteLoading(true)
    try {
      await api.del(`/api/projects/${project.id}`)
      toast.success('项目已删除')
      router.push('/projects')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-white/50" />
        ))}
      </div>
    )
  }
  if (!project) return <EmptyState title="项目不存在" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> 返回项目列表
        </Link>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4" /> 编辑项目
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-600" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> 删除项目
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <StatusBadge value={project.status} label={getLabel('project_status', project.status)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Info label="项目编号" value={project.code} />
          {project.description && (
            <div>
              <p className="text-xs text-slate-500">项目描述</p>
              <p className="mt-1 text-slate-600">{project.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
            <Info label="开始日期" value={toDateStr(project.startDate)} />
            <Info label="结束日期" value={toDateStr(project.endDate)} />
            <Info label="合同数量" value={`${project._count?.contracts ?? 0} 份`} />
            <Info label="创建人" value={project.creator?.name ?? '-'} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">金额汇总</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <SummaryItem label="销售合同总金额" value={project.summary?.salesContractTotal ?? 0} tone="sales" />
          <SummaryItem label="已开票总金额" value={project.summary?.invoiceOut ?? 0} tone="sales" />
          <SummaryItem label="采购合同总金额" value={project.summary?.purchaseContractTotal ?? 0} tone="purchase" />
          <SummaryItem label="已收票总金额" value={project.summary?.invoiceIn ?? 0} tone="purchase" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">关联合同</CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setContractFormOpen(true)}>
              <Plus className="h-4 w-4" /> 新增合同
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <EmptyState title="暂无关联合同" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>合同类型</TableHead>
                  <TableHead>合同编号</TableHead>
                  <TableHead>合同名称</TableHead>
                  <TableHead>甲方</TableHead>
                  <TableHead>乙方</TableHead>
                  <TableHead>金额</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow
                    key={c.id}
                    onClick={() => router.push(`/contracts/${c.id}`)}
                    className="h-14 cursor-pointer transition-colors hover:bg-white/40"
                  >
                    <TableCell><StatusBadge value={c.contractType} label={getLabel('contract_type', c.contractType)} /></TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{c.code}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs text-slate-500">{c.partyA?.name ?? '-'}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs text-slate-500">{c.partyB?.name ?? '-'}</TableCell>
                    <TableCell className="tabular-nums">¥{formatMoney(c.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={project}
        onSaved={() => {
          setFormOpen(false)
          load()
        }}
      />

      <ContractFormDialog
        open={contractFormOpen}
        onOpenChange={setContractFormOpen}
        projectId={projectId}
        onSaved={() => {
          setContractFormOpen(false)
          load()
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        variant="danger"
        title="删除项目"
        description={`确定删除项目「${project.name}」?删除后不可恢复。`}
        confirmText="删除"
        loading={deleteLoading}
        onConfirm={onDelete}
      />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn('mt-0.5 text-slate-700')}>{value}</p>
    </div>
  )
}

const summaryTones: Record<string, string> = {
  default: 'border-glass-hairline bg-white/40 text-slate-800',
  sales: 'border-green-100 bg-green-50/60 text-green-600',
  purchase: 'border-amber-100 bg-amber-50/60 text-amber-600',
}

function SummaryItem({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'sales' | 'purchase' | 'default' }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${summaryTones[tone]}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">¥{formatMoney(value)}</p>
    </div>
  )
}
