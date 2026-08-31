'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Search, Trash2, FolderKanban } from 'lucide-react'
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
import { ProjectFormDialog } from './project-form-dialog'
import { useDicts } from '@/hooks/use-dicts'
import { api } from '@/lib/api-client'
import { cn, toDateStr } from '@/lib/utils'

interface Project {
  id: number
  code: string
  name: string
  description: string | null
  status: number
  startDate: string
  endDate: string
  version: number
  _count?: { contracts: number }
}

export function ProjectsClient({ canManage, companyId }: { canManage: boolean; companyId: number | null }) {
  const { getLabel, options } = useDicts(['project_status'])
  const [list, setList] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [statusTab, setStatusTab] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ list: Project[]; total: number }>('/api/projects', {
        page,
        pageSize,
        keyword: keyword || undefined,
        status: statusTab ?? undefined,
      })
      setList(data.list)
      setTotal(data.total)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword, statusTab, companyId])

  useEffect(() => {
    load()
  }, [load])

  async function onDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await api.del(`/api/projects/${deleting.id}`)
      toast.success('项目已删除')
      setDeleting(null)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const statusTabs = options('project_status')

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setStatusTab(null)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              statusTab === null ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            全部
          </button>
          {statusTabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusTab(Number(t.value))}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                statusTab === Number(t.value) ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="w-56 pl-8"
              placeholder="搜索项目名称 / 编号"
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
              <Plus className="h-4 w-4" /> 新增项目
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState title="暂无项目" description="点击右上角「新增项目」开始创建" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>项目编号</TableHead>
                <TableHead>项目名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>起止日期</TableHead>
                <TableHead>合同数</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell className="font-mono text-xs text-slate-500">{p.code}</TableCell>
                  <TableCell>
                    <Link href={`/projects/${p.id}`} className="font-medium text-slate-800 hover:text-primary">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={p.status} label={getLabel('project_status', p.status)} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {toDateStr(p.startDate)} ~ {toDateStr(p.endDate)}
                  </TableCell>
                  <TableCell>{p._count?.contracts ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        render={<Link href={`/projects/${p.id}`} />}
                      >
                        <FolderKanban className="h-3.5 w-3.5" /> 详情
                      </Button>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-primary"
                          onClick={() => {
                            setEditing(p)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> 编辑
                        </Button>
                      )}
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-red-500 hover:text-red-600"
                          onClick={() => setDeleting(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> 删除
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => {
          setFormOpen(false)
          setPage(1)
          load()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="删除项目"
        description={deleting ? `确定删除项目「${deleting.name}」吗?删除后不可恢复。` : ''}
        confirmText="删除"
        variant="danger"
        loading={deleteLoading}
        onConfirm={onDelete}
      />
    </div>
  )
}
