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
import { UserFormDialog } from './user-form-dialog'
import { UserDetailDialog } from './user-detail-dialog'
import { useDicts } from '@/hooks/use-dicts'
import { api } from '@/lib/api-client'

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
  const [detailId, setDetailId] = useState<number | null>(null)

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => (
                <TableRow
                  key={u.id}
                  onClick={() => setDetailId(u.id)}
                  className="h-12 cursor-pointer transition-colors hover:bg-slate-50"
                >
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

      <UserDetailDialog
        userId={detailId}
        open={detailId != null}
        onOpenChange={(o) => !o && setDetailId(null)}
        onEdit={(u) => {
          setDetailId(null)
          setEditing(u)
          setFormOpen(true)
        }}
        onChanged={load}
      />
    </div>
  )
}
