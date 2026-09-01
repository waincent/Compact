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
import { toDateStr } from '@/lib/utils'

interface Company { id: number; name: string }
interface Project { id: number; code: string; name: string; status: number }

const schema = z.object({
  name: z.string().min(1, '请输入合同名称'),
  projectId: z.string().min(1, '请选择所属项目'),
  partyAId: z.string().min(1, '请选择甲方公司'),
  partyBId: z.string().min(1, '请选择乙方公司'),
  contractType: z.string().min(1, '请选择合同类型'),
  totalAmount: z.string().refine((v) => v !== '' && Number(v) > 0, '合同金额需大于 0'),
  signDate: z.string().min(1, '请选择签订日期'),
  startDate: z.string().min(1, '请选择开始日期'),
  endDate: z.string().min(1, '请选择结束日期'),
})

type FormValues = z.infer<typeof schema>

/** 编辑模式回填的合同数据(与详情接口返回字段对齐) */
interface EditingContract {
  id: number
  name: string
  projectId: number
  partyAId: number
  partyBId: number
  contractType: number
  totalAmount: number
  signDate: string
  startDate: string
  endDate: string
  version: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  /** 从项目详情进入时预选项目(隐藏所属项目下拉) */
  projectId?: number
  /** 传入则为编辑模式 */
  editing?: EditingContract
}

export function ContractFormDialog({ open, onOpenChange, onSaved, projectId, editing }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', projectId: '', partyAId: '', partyBId: '', contractType: '1',
      totalAmount: '', signDate: '', startDate: '', endDate: '',
    },
  })

  useEffect(() => {
    if (open) {
      Promise.all([
        api.get<{ list: Project[] }>('/api/projects', { pageSize: 100, status: undefined }),
        api.get<{ list: Company[] }>('/api/companies', { pageSize: 100 }),
      ])
        .then(([p, c]) => {
          setProjects(p.list)
          setCompanies(c.list)
        })
        .catch(() => {})
      form.reset(
        editing
          ? {
              name: editing.name,
              projectId: String(editing.projectId),
              partyAId: String(editing.partyAId),
              partyBId: String(editing.partyBId),
              contractType: String(editing.contractType),
              totalAmount: String(editing.totalAmount),
              signDate: toDateStr(editing.signDate),
              startDate: toDateStr(editing.startDate),
              endDate: toDateStr(editing.endDate),
            }
          : {
              name: '', projectId: projectId ? String(projectId) : '', partyAId: '', partyBId: '', contractType: '1',
              totalAmount: '', signDate: '', startDate: '', endDate: '',
            },
      )
    }
  }, [open, projectId, editing, form])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload = {
        name: values.name,
        projectId: Number(values.projectId),
        partyAId: Number(values.partyAId),
        partyBId: Number(values.partyBId),
        contractType: Number(values.contractType),
        totalAmount: Number(values.totalAmount),
        signDate: values.signDate,
        startDate: values.startDate,
        endDate: values.endDate,
      }
      if (editing) {
        await api.put(`/api/contracts/${editing.id}`, { ...payload, version: editing.version })
        toast.success('合同已更新')
      } else {
        await api.post('/api/contracts', payload)
        toast.success('合同已创建')
      }
      onSaved()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const companyName = (id: string) => {
    const c = companies.find((x) => String(x.id) === id)
    return c ? c.name : '请选择'
  }

  const selectedProject = projects.find((p) => p.id === projectId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑合同' : '新增合同'}</DialogTitle>
          <DialogDescription>
            {editing ? '可调整合同金额与基本信息,新金额不能低于已发生的资金/发票合计' : '创建后自动生成合同编号'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              所属项目 <span className="text-red-500">*</span>
            </Label>
            {projectId ? (
              <div className="rounded-lg border border-glass-border bg-white/40 px-3 py-2 text-sm text-slate-600">
                {selectedProject ? `${selectedProject.code} · ${selectedProject.name}` : `项目 #${projectId}`}
              </div>
            ) : (
              <Select
                value={form.watch('projectId') ?? ''}
                onValueChange={(v) => form.setValue('projectId', v ?? '', { shouldValidate: true })}
              >
                <SelectTrigger className="w-full!"><SelectValue placeholder="选择项目" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.code} · {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.projectId && (
              <p className="text-xs text-red-500">{form.formState.errors.projectId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">
              合同名称 <span className="text-red-500">*</span>
            </Label>
            <Input id="name" {...form.register('name')} placeholder="如:智慧城市平台开发合同" />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                甲方公司 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.watch('partyAId') ?? ''}
                onValueChange={(v) => form.setValue('partyAId', v ?? '', { shouldValidate: true })}
              >
                <SelectTrigger className="w-full!"><SelectValue placeholder="选择甲方" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.partyAId && (
                <p className="text-xs text-red-500">{form.formState.errors.partyAId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                乙方公司 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.watch('partyBId') ?? ''}
                onValueChange={(v) => form.setValue('partyBId', v ?? '', { shouldValidate: true })}
              >
                <SelectTrigger className="w-full!"><SelectValue placeholder="选择乙方" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.partyBId && (
                <p className="text-xs text-red-500">{form.formState.errors.partyBId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                合同类型 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.watch('contractType') ?? ''}
                onValueChange={(v) => form.setValue('contractType', v ?? '1', { shouldValidate: true })}
              >
                <SelectTrigger className="w-full!"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">销售</SelectItem>
                  <SelectItem value="2">采购</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.contractType && (
                <p className="text-xs text-red-500">{form.formState.errors.contractType.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalAmount">
                合同金额(元) <span className="text-red-500">*</span>
              </Label>
              <Input id="totalAmount" type="number" step="0.01" min="0" {...form.register('totalAmount')} placeholder="如 500000" />
              {form.formState.errors.totalAmount && (
                <p className="text-xs text-red-500">{form.formState.errors.totalAmount.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="signDate">
                签订日期 <span className="text-red-500">*</span>
              </Label>
              <Input id="signDate" type="date" {...form.register('signDate')} />
              {form.formState.errors.signDate && (
                <p className="text-xs text-red-500">{form.formState.errors.signDate.message}</p>
              )}
            </div>
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

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? '保存' : '创建合同'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
