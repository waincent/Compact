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
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/lib/api-client'
import { useDicts } from '@/hooks/use-dicts'
import { toDateStr } from '@/lib/utils'

interface Project {
  id: number
  code: string
  name: string
  description: string | null
  status: number
  startDate: string
  endDate: string
  version: number
}

const schema = z.object({
  name: z.string().min(1, '请输入项目名称'),
  description: z.string().optional(),
  status: z.string().min(1, '请选择状态'),
  startDate: z.string().min(1, '请选择开始日期'),
  endDate: z.string().min(1, '请选择结束日期'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Project | null
  onSaved: () => void
}

export function ProjectFormDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const { options } = useDicts(['project_status'])
  const [submitting, setSubmitting] = useState(false)
  const isEdit = Boolean(editing)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', description: '', status: '1', startDate: '', endDate: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: editing?.name ?? '',
        description: editing?.description ?? '',
        status: String(editing?.status ?? 1),
        startDate: editing ? toDateStr(editing.startDate) : '',
        endDate: editing ? toDateStr(editing.endDate) : '',
      })
    }
  }, [open, editing, form])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload = {
        name: values.name,
        description: values.description || null,
        status: Number(values.status),
        startDate: values.startDate,
        endDate: values.endDate,
      }
      if (isEdit && editing) {
        await api.put(`/api/projects/${editing.id}`, { ...payload, version: editing.version })
        toast.success('项目已更新')
      } else {
        await api.post('/api/projects', payload)
        toast.success('项目已创建')
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
          <DialogTitle>{isEdit ? `编辑项目 ${editing?.code ?? ''}` : '新增项目'}</DialogTitle>
          <DialogDescription>{isEdit ? '修改项目基本信息' : '创建项目后将自动生成项目编号'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              项目名称 <span className="text-red-500">*</span>
            </Label>
            <Input id="name" {...form.register('name')} placeholder="如:智慧城市数据平台" />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              项目状态 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.watch('status') ?? ''}
              onValueChange={(v) => form.setValue('status', v ?? '1', { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                {options('project_status').map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">
                开始日期 <span className="text-red-500">*</span>
              </Label>
              <Input id="startDate" type="date" {...form.register('startDate')} />
              {form.formState.errors.startDate && (
                <p className="text-xs text-red-500">{form.formState.errors.startDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">
                结束日期 <span className="text-red-500">*</span>
              </Label>
              <Input id="endDate" type="date" {...form.register('endDate')} />
              {form.formState.errors.endDate && (
                <p className="text-xs text-red-500">{form.formState.errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">项目描述</Label>
            <Textarea id="description" rows={3} {...form.register('description')} placeholder="项目背景与目标" />
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
