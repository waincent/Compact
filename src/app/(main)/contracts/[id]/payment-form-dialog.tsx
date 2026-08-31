'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'
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
import { today } from '@/lib/utils'

interface ContractOpt {
  id: number
  code: string
  name: string
  totalAmount: number
  /** 用于推导资金方向:销售=收款、采购=付款 */
  contractType: number
}

const schema = z.object({
  contractId: z.string().min(1, '请选择合同'),
  amount: z.string().refine((v) => v !== '' && Number(v) > 0, '金额需大于 0'),
  recordDate: z.string().min(1, '请选择日期'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  /** 从合同详情内进入时预选合同(隐藏所属合同下拉) */
  contractId?: number
}

export function PaymentFormDialog({ open, onOpenChange, onSaved, contractId }: Props) {
  const [contracts, setContracts] = useState<ContractOpt[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [voucherFile, setVoucherFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { contractId: '', amount: '', recordDate: today() },
  })

  useEffect(() => {
    if (open) {
      api
        .get<{ list: ContractOpt[] }>('/api/contracts', { pageSize: 100 })
        .then((d) => setContracts(d.list))
        .catch(() => setContracts([]))
      setVoucherFile(null)
      form.reset({
        contractId: contractId ? String(contractId) : '',
        amount: '',
        recordDate: today(),
      })
    }
  }, [open, contractId, form])

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === Number(form.watch('contractId'))),
    [contracts, form.watch('contractId')],
  )

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const created = await api.post<{ id: number }>('/api/payments', {
        contractId: contractId ?? Number(values.contractId),
        amount: Number(values.amount),
        recordDate: values.recordDate,
      })
      let uploadErr: string | null = null
      if (voucherFile) {
        try {
          const form = new FormData()
          form.append('file', voucherFile)
          const res = await fetch(`/api/upload?businessType=payment&businessId=${created.id}`, {
            method: 'POST',
            body: form,
            cache: 'no-store',
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data?.message ?? '凭证上传失败')
        } catch (e) {
          uploadErr = (e as Error).message
        }
      }
      if (uploadErr) toast.error(`资金记录已登记,但凭证上传失败:${uploadErr}`)
      else toast.success('资金记录已登记')
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
          <DialogTitle>新增资金记录</DialogTitle>
          <DialogDescription>登记合同资金记录,收款/付款由合同类型自动确定,金额不得超出合同总额</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {contractId ? (
            <div className="space-y-1.5">
              <Label>
                所属合同 <span className="text-red-500">*</span>
              </Label>
              <div className="rounded-lg border border-glass-border bg-white/40 px-3 py-2 text-sm text-slate-600">
                {selectedContract ? `${selectedContract.code} · ${selectedContract.name}` : `合同 #${contractId}`}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>
                所属合同 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.watch('contractId') ?? ''}
                onValueChange={(v) => form.setValue('contractId', v ?? '', { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="选择合同" /></SelectTrigger>
                <SelectContent>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.code} · {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.contractId && (
                <p className="text-xs text-red-500">{form.formState.errors.contractId.message}</p>
              )}
            </div>
          )}

          {selectedContract && (
            <p className="rounded-md bg-white/40 px-3 py-2 text-xs text-slate-500">
              该合同为{selectedContract.contractType === 1 ? '销售合同,资金将记为收款' : '采购合同,资金将记为付款'}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="amount">
              金额(元) <span className="text-red-500">*</span>
            </Label>
            <Input id="amount" type="number" step="0.01" min="0" {...form.register('amount')} placeholder="如 100000" />
            {form.formState.errors.amount && (
              <p className="text-xs text-red-500">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recordDate">
              发生日期 <span className="text-red-500">*</span>
            </Label>
            <Input id="recordDate" type="date" {...form.register('recordDate')} />
            {form.formState.errors.recordDate && (
              <p className="text-xs text-red-500">{form.formState.errors.recordDate.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>凭证图片(可选)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setVoucherFile(f)
                e.target.value = ''
              }}
            />
            {voucherFile ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-glass-border bg-white/40 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
                  <ImageIcon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="truncate">{voucherFile.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">{(voucherFile.size / 1024).toFixed(0)} KB</span>
                </span>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 shrink-0 px-0 text-slate-500" onClick={() => setVoucherFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> 选择凭证图片
              </Button>
            )}
            <p className="text-xs text-slate-500">支持图片格式,单个文件不超过 20MB</p>
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
