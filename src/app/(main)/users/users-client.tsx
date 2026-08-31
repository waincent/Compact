'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Power, Search, Trash2 } from 'lucide-react'
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
import { UserFormDialog } from './user-form-dialog'
import { useDicts } from '@/hooks/use-dicts'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface UserRow {
  id: number
  username: string
  name: string
  email: string | null
  phone: string | null
  role: number
  companyId: number | null
  companyName?: string | null
  status: number
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
}

export function UsersClient({ companyId }: { companyId: number | null }) {
  const { getLabel } = useDicts(['user_role', 'user_status'])
  const [list, setList] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [deleting, setDeleting] = useState<UserRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ list: UserRow[]; total: number }>('/api/users', {
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
  }, [page, pageSize, keyword, companyId])

  useEffect(() => {
    load()
  }, [load])

  async function onToggleStatus(u: UserRow) {
    const next = u.status === 1 ? 0 : 1
    try {
      await api.put(`/api/users/${u.id}`, { status: next })
      toast.success(next === 1 ? '已启用' : '已停用')
      load()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function onDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await api.del(`/api/users/${deleting.id}`)
      toast.success('用户已删除')
      setDeleting(null)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="w-64 pl-8"
            placeholder="搜索用户名 / 姓名"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4" /> 新增用户
        </Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState title="暂无用户" description="点击右上角「新增用户」开始创建" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>所属公司</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最近登录</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell className="text-slate-500">{u.companyName ?? '-'}</TableCell>
                  <TableCell>
                    <StatusBadge value={u.role} label={getLabel('user_role', u.role)} />
                  </TableCell>
                  <TableCell className="text-slate-500">{u.email ?? '-'}</TableCell>
                  <TableCell>
                    <StatusBadge value={u.status} label={getLabel('user_status', u.status)} />
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('zh-CN', { hour12: false }) : '从未登录'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-primary"
                        onClick={() => {
                          setEditing(u)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> 编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn('h-8 px-2', u.status === 1 ? 'text-amber-600' : 'text-green-600')}
                        onClick={() => onToggleStatus(u)}
                      >
                        <Power className="h-3.5 w-3.5" /> {u.status === 1 ? '停用' : '启用'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-red-500 hover:text-red-600"
                        onClick={() => setDeleting(u)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> 删除
                      </Button>
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

      <UserFormDialog
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
        title="删除用户"
        description={deleting ? `确定删除用户「${deleting.username}」吗?该操作不可恢复。` : ''}
        confirmText="删除"
        variant="danger"
        loading={deleteLoading}
        onConfirm={onDelete}
      />
    </div>
  )
}
