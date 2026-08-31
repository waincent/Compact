'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/lib/api-client'
import { today } from '@/lib/utils'

const schema = z.object({
  acceptDate: z.string().min(1, '请选择验收日期'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  /** 所属合同(从合同详情进入) */
  contractId: number
}

export function AcceptanceFormDialog({ open, onOpenChange, onSaved, contractId }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [acceptFile, setAcceptFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { acceptDate: today() },
  })

  // 打开时重置表单
  useEffect(() => {
    if (!open) return
    setAcceptFile(null)
    form.reset({ acceptDate: today() })
  }, [open, form])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const created = await api.post<{ id: number }>(`/api/contracts/${contractId}/acceptances`, {
        acceptDate: values.acceptDate,
      })
      let uploadErr: string | null = null
      if (acceptFile) {
        try {
          const form = new FormData()
          form.append('file', acceptFile)
          const res = await fetch(`/api/upload?businessType=acceptance&businessId=${created.id}`, {
            method: 'POST',
            body: form,
            cache: 'no-store',
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data?.message ?? '验收单文件上传失败')
        } catch (e) {
          uploadErr = (e as Error).message
        }
      }
      if (uploadErr) toast.error(`验收单据已登记,但验收单文件上传失败:${uploadErr}`)
      else toast.success('验收单据已登记')
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
          <DialogTitle>新增验收单据</DialogTitle>
          <DialogDescription>登记合同验收日期,可上传验收单文件</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="acceptDate">
              验收日期 <span className="text-red-500">*</span>
            </Label>
            <Input id="acceptDate" type="date" {...form.register('acceptDate')} />
            {form.formState.errors.acceptDate && (
              <p className="text-xs text-red-500">{form.formState.errors.acceptDate.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>验收单文件</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setAcceptFile(f)
                e.target.value = ''
              }}
            />
            {acceptFile ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-white/40 bg-white/40 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{acceptFile.name}</span>
                  <span className="shrink-0 text-xs text-slate-400">{(acceptFile.size / 1024).toFixed(0)} KB</span>
                </span>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 shrink-0 px-0 text-slate-400" onClick={() => setAcceptFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> 选择验收单文件
              </Button>
            )}
            <p className="text-xs text-slate-500">支持图片/PDF,单个文件不超过 20MB</p>
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
