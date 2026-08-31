'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PaginationBar } from '@/components/data-table/pagination-bar'
import { EmptyState } from '@/components/data-table/empty-state'
import { StatusBadge } from '@/components/data-table/status-badge'
import { ConfirmDialog } from '@/components/data-table/confirm-dialog'
import { CompanyFormDialog } from './company-form-dialog'
import { CompanyDetailDialog } from './company-detail-dialog'
import { useDicts } from '@/hooks/use-dicts'
import { api } from '@/lib/api-client'
import type { Company } from '@/types/company'

export function CompaniesClient({ canManage }: { canManage: boolean }) {
  const { getLabel } = useDicts(['company_status'])
  const [list, setList] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [detail, setDetail] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState<Company | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ list: Company[]; total: number }>('/api/companies', {
        page,
        pageSize,
        keyword: keyword || undefined,
      })
      setList(data.list)
      setTotal(data.total)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword])

  useEffect(() => {
    load()
  }, [load])

  async function onDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await api.del(`/api/companies/${deleting.id}`)
      toast.success('公司已删除')
      setDeleting(null)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  async function onToggleStatus(company: Company) {
    const next = company.status === 1 ? 0 : 1
    try {
      await api.put(`/api/companies/${company.id}`, {
        name: company.name,
        creditCode: company.creditCode,
        address: company.address,
        phone: company.phone,
        contactName: company.contactName,
        contactPhone: company.contactPhone,
        bankName: company.bankName,
        bankAccount: company.bankAccount,
        remark: company.remark,
        status: next,
      })
      toast.success(next === 1 ? '已启用' : '已停用')
      setDetail((d) => (d && d.id === company.id ? { ...d, status: next } : d))
      load()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  function onEdit(company: Company) {
    setDetail(null)
    setEditing(company)
    setFormOpen(true)
  }

  function onDeleteRequest(company: Company) {
    setDetail(null)
    setDeleting(company)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="w-56 pl-8"
              placeholder="搜索公司名称/信用代码/地址"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setPage(1)
              }}
            />
          </div>
          {canManage && (
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> 新增公司
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[50px] w-full" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState title="暂无公司" description="点击右上角「新增公司」开始创建" />
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>公司名称</TableHead>
                <TableHead>社会信用代码</TableHead>
                <TableHead>公司地址</TableHead>
                <TableHead>公司电话</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>联系电话</TableHead>
                <TableHead>开户银行</TableHead>
                <TableHead>银行账号</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow
                  key={c.id}
                  className="h-[50px] cursor-pointer hover:bg-slate-50/60"
                  onClick={() => setDetail(c)}
                >
                  <TableCell className="min-w-[180px] font-medium">{c.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.creditCode ?? '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{c.address ?? '-'}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.phone ?? '-'}</TableCell>
                  <TableCell>{c.contactName ?? '-'}</TableCell>
                  <TableCell>{c.contactPhone ?? '-'}</TableCell>
                  <TableCell>{c.bankName ?? '-'}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.bankAccount ?? '-'}</TableCell>
                  <TableCell>
                    <StatusBadge value={c.status} label={getLabel('company_status', c.status)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </Card>

      {total > 0 && (
        <PaginationBar
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(1)
          }}
        />
      )}

      <CompanyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => {
          setFormOpen(false)
          setPage(1)
          load()
        }}
      />

      <CompanyDetailDialog
        company={detail}
        canManage={canManage}
        onOpenChange={(o) => !o && setDetail(null)}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
        onDelete={onDeleteRequest}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="删除公司"
        description={deleting ? `确定删除「${deleting.name}」吗?删除后不可恢复。` : ''}
        confirmText="删除"
        variant="danger"
        loading={deleteLoading}
        onConfirm={onDelete}
      />
    </div>
  )
}
