'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Power, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/data-table/status-badge'
import { ConfirmDialog } from '@/components/data-table/confirm-dialog'
import { useDicts } from '@/hooks/use-dicts'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface UserDetail {
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
  lastLoginIp: string | null
  createdAt: string
}

interface Props {
  userId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (u: UserDetail) => void
  onChanged: () => void
}

const fmtTime = (v: string | null) =>
  v ? new Date(v).toLocaleString('zh-CN', { hour12: false }) : null

export function UserDetailDialog({ userId, open, onOpenChange, onEdit, onChanged }: Props) {
  const { getLabel } = useDicts(['user_role', 'user_status'])
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (open && userId != null) {
      setLoading(true)
      api
        .get<UserDetail>(`/api/users/${userId}`)
        .then(setUser)
        .catch((err) => toast.error((err as Error).message))
        .finally(() => setLoading(false))
    } else {
      setUser(null)
    }
  }, [open, userId])

  async function onToggle() {
    if (!user) return
    const next = user.status === 1 ? 0 : 1
    setToggling(true)
    try {
      await api.put(`/api/users/${user.id}`, { status: next })
      toast.success(next === 1 ? '已启用' : '已停用')
      setUser({ ...user, status: next })
      onChanged()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setToggling(false)
    }
  }

  async function onDelete() {
    if (!user) return
    setDeleteLoading(true)
    try {
      await api.del(`/api/users/${user.id}`)
      toast.success('用户已删除')
      setDeleteOpen(false)
      onOpenChange(false)
      onChanged()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
          </DialogHeader>

          {loading || !user ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-6 w-1/3" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold">{user.name}</p>
                <StatusBadge value={user.status} label={getLabel('user_status', user.status)} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Info label="用户名" value={user.username} mono />
                <Info label="所属公司" value={user.companyName ?? '-'} />
                <Info label="角色" value={getLabel('user_role', user.role)} />
                <Info label="需要修改密码" value={user.mustChangePassword ? '是' : '否'} />
                <Info label="邮箱" value={user.email ?? '-'} />
                <Info label="手机号" value={user.phone ?? '-'} />
                <Info label="最近登录" value={fmtTime(user.lastLoginAt) ?? '从未登录'} />
                <Info label="创建时间" value={fmtTime(user.createdAt) ?? '-'} />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" onClick={() => user && onEdit(user)} disabled={!user}>
              <Pencil className="h-4 w-4" /> 编辑
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!user || toggling}
              onClick={onToggle}
              className={cn(user && (user.status === 1 ? 'text-amber-600' : 'text-green-600'))}
            >
              {toggling && <Loader2 className="h-4 w-4 animate-spin" />}
              <Power className="h-4 w-4" /> {user?.status === 1 ? '停用' : '启用'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!user}
              onClick={() => setDeleteOpen(true)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" /> 删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        variant="danger"
        title="删除用户"
        description={user ? `确定删除用户「${user.username}」吗?该操作不可恢复。` : ''}
        confirmText="删除"
        loading={deleteLoading}
        onConfirm={onDelete}
      />
    </>
  )
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn('mt-0.5 text-slate-700', mono && 'font-mono text-xs')}>{value}</p>
    </div>
  )
}
