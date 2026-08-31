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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/lib/api-client'
import type { Company } from '@/types/company'

const schema = z.object({
  name: z.string().min(1, '请输入公司全称'),
  creditCode: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  remark: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Company | null
  onSaved: () => void
}

export function CompanyFormDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const isEdit = Boolean(editing)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', creditCode: '', address: '', phone: '',
      contactName: '', contactPhone: '', bankName: '', bankAccount: '', remark: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: editing?.name ?? '',
        creditCode: editing?.creditCode ?? '',
        address: editing?.address ?? '',
        phone: editing?.phone ?? '',
        contactName: editing?.contactName ?? '',
        contactPhone: editing?.contactPhone ?? '',
        bankName: editing?.bankName ?? '',
        bankAccount: editing?.bankAccount ?? '',
        remark: editing?.remark ?? '',
      })
    }
  }, [open, editing, form])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload = {
        name: values.name,
        creditCode: values.creditCode || null,
        address: values.address || null,
        phone: values.phone || null,
        contactName: values.contactName || null,
        contactPhone: values.contactPhone || null,
        bankName: values.bankName || null,
        bankAccount: values.bankAccount || null,
        remark: values.remark || null,
      }
      if (isEdit && editing) {
        await api.put(`/api/companies/${editing.id}`, payload)
        toast.success('公司信息已更新')
      } else {
        await api.post('/api/companies', payload)
        toast.success('公司已创建')
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑公司' : '新增公司'}</DialogTitle>
          <DialogDescription>填写公司档案信息,信用代码重复时将提示</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              公司全称 <span className="text-red-500">*</span>
            </Label>
            <Input id="name" {...form.register('name')} placeholder="如:腾讯科技(深圳)有限公司" />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="creditCode">社会信用代码</Label>
            <Input id="creditCode" {...form.register('creditCode')} placeholder="统一社会信用代码" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="address">公司地址</Label>
              <Input id="address" {...form.register('address')} placeholder="注册地址 / 办公地址" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">公司电话</Label>
              <Input id="phone" {...form.register('phone')} placeholder="公司总机 / 服务热线" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contactName">联系人</Label>
              <Input id="contactName" {...form.register('contactName')} placeholder="联系人姓名" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">联系电话</Label>
              <Input id="contactPhone" {...form.register('contactPhone')} placeholder="联系电话" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankName">开户银行</Label>
              <Input id="bankName" {...form.register('bankName')} placeholder="开户银行" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankAccount">银行账号</Label>
              <Input id="bankAccount" {...form.register('bankAccount')} placeholder="银行账号" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="remark">备注</Label>
            <Textarea id="remark" rows={3} {...form.register('remark')} placeholder="备注信息" />
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
