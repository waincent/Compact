'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/lib/api-client'
import { useDicts } from '@/hooks/use-dicts'

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
}

interface CompanyOpt {
  id: number
  name: string
}

const schema = z.object({
  username: z.string().min(2, '用户名至少 2 个字符').regex(/^[a-zA-Z0-9_]+$/, '用户名仅支持字母/数字/下划线'),
  name: z.string().min(1, '请输入姓名'),
  email: z.string().email('邮箱格式不正确').or(z.literal('')).optional(),
  phone: z.string().optional(),
  role: z.string().min(1, '请选择角色'),
  // 'platform' 表示平台超管(admin),不归属任何公司
  companyId: z.string().refine((v) => v === 'platform' || (v !== '' && Number(v) > 0), '请选择所属公司'),
  password: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: UserRow | null
  onSaved: () => void
}

export function UserFormDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const { options } = useDicts(['user_role'])
  const [companies, setCompanies] = useState<CompanyOpt[]>([])
  const [submitting, setSubmitting] = useState(false)
  const isEdit = Boolean(editing)
  const isAdminUser = editing?.username === 'admin'

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', name: '', email: '', phone: '', role: '4', companyId: '', password: '' },
  })

  useEffect(() => {
    if (open) {
      api
        .get<{ list: CompanyOpt[] }>('/api/companies', { pageSize: 100 })
        .then((d) => setCompanies(d.list))
        .catch(() => setCompanies([]))
      form.reset({
        username: editing?.username ?? '',
        name: editing?.name ?? '',
        email: editing?.email ?? '',
        phone: editing?.phone ?? '',
        role: String(editing?.role ?? 4),
        companyId: editing?.username === 'admin' ? 'platform' : String(editing?.companyId ?? ''),
        password: '',
      })
    }
  }, [open, editing, form])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      if (isEdit && editing) {
        const payload: Record<string, unknown> = {
          name: values.name,
          email: values.email || null,
          phone: values.phone || null,
          role: Number(values.role),
        }
        // 平台超管(admin)不归属公司,跳过 companyId
        if (values.companyId !== 'platform') payload.companyId = Number(values.companyId)
        if (values.password) payload.password = values.password
        await api.put(`/api/users/${editing.id}`, payload)
        toast.success(values.password ? '用户信息已更新,密码已重置' : '用户信息已更新')
      } else {
        await api.post('/api/users', {
          username: values.username,
          name: values.name,
          email: values.email || null,
          phone: values.phone || null,
          role: Number(values.role),
          companyId: Number(values.companyId),
          password: values.password || '123456',
        })
        toast.success('用户已创建')
      }
      onSaved()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑用户' : '新增用户'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '可修改用户资料、角色,填写新密码将重置登录密码' : '创建系统用户,初始密码默认 123456'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {isEdit && editing ? (
            <div className="space-y-1.5">
              <Label>用户名</Label>
              <Input value={editing.username} disabled />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="username">
                用户名 <span className="text-red-500">*</span>
              </Label>
              <Input id="username" placeholder="字母/数字/下划线,如 zhangsan" {...form.register('username')} />
              {form.formState.errors.username && (
                <p className="text-xs text-red-500">{form.formState.errors.username.message}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              所属公司 <span className="text-red-500">*</span>
            </Label>
            {isAdminUser ? (
              <>
                <Input value="平台超管(全部)" disabled />
                <p className="text-xs text-slate-500">admin 为平台超管账号,不归属任何公司</p>
              </>
            ) : (
              <>
                <Select
                  value={form.watch('companyId') ?? ''}
                  onValueChange={(v) => form.setValue('companyId', v ?? '', { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择所属公司" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.companyId && (
                  <p className="text-xs text-red-500">{form.formState.errors.companyId.message}</p>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                姓名 <span className="text-red-500">*</span>
              </Label>
              <Input id="name" {...form.register('name')} placeholder="真实姓名" />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                角色 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.watch('role') ?? ''}
                onValueChange={(v) => form.setValue('role', v ?? '4', { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  {options('user_role').map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" {...form.register('email')} placeholder="用于接收通知" />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">手机号</Label>
              <Input id="phone" {...form.register('phone')} placeholder="手机号" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              {isEdit ? '重置密码' : '初始密码'} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              {...form.register('password')}
              placeholder={isEdit ? '留空则不修改密码' : '默认 123456,至少 6 位'}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
