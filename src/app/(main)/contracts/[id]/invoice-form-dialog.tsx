'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Info, Upload, FileText, X } from 'lucide-react'
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
import { formatMoney, calcFromGross } from '@/lib/money'

interface ContractOpt {
  id: number
  code: string
  name: string
  totalAmount: number
  /** 用于推导发票销项/进项:销售=1、采购=2 */
  contractType: number
}

const schema = z.object({
  contractId: z.string().min(1, '请选择合同'),
  invoiceNumber: z.string().min(1, '请输入发票号码'),
  totalAmountWithTax: z.string().refine((v) => v !== '' && Number(v) > 0, '含税金额需大于 0'),
  taxRate: z.string().refine((v) => ['6', '9', '13'].includes(v), '税率需为 6%/9%/13%'),
  issueDate: z.string().min(1, '请选择开票日期'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  /** 从合同详情内进入时预选合同(隐藏所属合同下拉) */
  contractId?: number
}

export function InvoiceFormDialog({ open, onOpenChange, onSaved, contractId }: Props) {
  const [contracts, setContracts] = useState<ContractOpt[]>([])
  const [dirInvoiced, setDirInvoiced] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contractId: '', invoiceNumber: '', totalAmountWithTax: '', taxRate: '6', issueDate: today(),
    },
  })

  const selectedContractId = form.watch('contractId')
  const gross = Number(form.watch('totalAmountWithTax') || 0)
  const taxRate = Number(form.watch('taxRate') || 0)
  const { amount: net, tax } = calcFromGross(gross, taxRate)

  // 拉取合同 + 已开票合计(用于「已开票/剩余可开」提示)
  useEffect(() => {
    if (!open) return
    api
      .get<{ list: ContractOpt[] }>('/api/contracts', { pageSize: 100 })
      .then((d) => setContracts(d.list))
      .catch(() => setContracts([]))
    setInvoiceFile(null)
    form.reset({
      contractId: contractId ? String(contractId) : '',
      invoiceNumber: '', totalAmountWithTax: '', taxRate: '6', issueDate: today(),
    })
  }, [open, contractId, form])

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === Number(selectedContractId)),
    [contracts, selectedContractId],
  )

  useEffect(() => {
    setDirInvoiced(0)
    if (!selectedContractId) return
    api
      .get<{ list: Array<{ totalAmountWithTax: number; amount: number }> }>(
        `/api/contracts/${selectedContractId}/invoices`,
      )
      .then((d) => {
        let sum = 0
        for (const inv of d.list) {
          if (inv.amount > 0) {
            sum = Math.round(sum * 100) / 100 + Math.round(inv.totalAmountWithTax * 100) / 100
          }
        }
        setDirInvoiced(Math.round(sum * 100) / 100)
      })
      .catch(() => setDirInvoiced(0))
  }, [selectedContractId])

  const contractRemaining = selectedContract
    ? Math.round((selectedContract.totalAmount - dirInvoiced) * 100) / 100
    : 0

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const created = await api.post<{ id: number }>('/api/invoices', {
        contractId: contractId ?? Number(values.contractId),
        invoiceNumber: values.invoiceNumber.trim(),
        totalAmountWithTax: Number(values.totalAmountWithTax),
        taxRate: Number(values.taxRate),
        issueDate: values.issueDate,
      })
      let uploadErr: string | null = null
      if (invoiceFile) {
        try {
          const form = new FormData()
          form.append('file', invoiceFile)
          const res = await fetch(`/api/upload?businessType=invoice&businessId=${created.id}`, {
            method: 'POST',
            body: form,
            cache: 'no-store',
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data?.message ?? '发票文件上传失败')
        } catch (e) {
          uploadErr = (e as Error).message
        }
      }
      if (uploadErr) toast.error(`发票记录已登记,但发票文件上传失败:${uploadErr}`)
      else toast.success('发票记录已登记')
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
          <DialogTitle>新增发票记录</DialogTitle>
          <DialogDescription>登记合同发票记录,销项/进项由合同类型自动确定</DialogDescription>
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
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Info className="h-3 w-3" />
              合同总额 ¥{formatMoney(selectedContract.totalAmount)} · 已开票 ¥{formatMoney(dirInvoiced)} · 剩余可开
              ¥{formatMoney(contractRemaining)}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="issueDate">
              开票日期 <span className="text-red-500">*</span>
            </Label>
            <Input id="issueDate" type="date" {...form.register('issueDate')} />
            {form.formState.errors.issueDate && (
              <p className="text-xs text-red-500">{form.formState.errors.issueDate.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invoiceNumber">
              发票号码 <span className="text-red-500">*</span>
            </Label>
            <Input id="invoiceNumber" placeholder="如 TESTINV202608001" {...form.register('invoiceNumber')} />
            {form.formState.errors.invoiceNumber && (
              <p className="text-xs text-red-500">{form.formState.errors.invoiceNumber.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="totalAmountWithTax">
                含税金额(元) <span className="text-red-500">*</span>
              </Label>
              <Input id="totalAmountWithTax" type="number" step="0.01" min="0" {...form.register('totalAmountWithTax')} placeholder="如 113000" />
              {form.formState.errors.totalAmountWithTax && (
                <p className="text-xs text-red-500">{form.formState.errors.totalAmountWithTax.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                税率(%) <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.watch('taxRate') ?? '6'}
                onValueChange={(v) => form.setValue('taxRate', v ?? '6', { shouldValidate: true })}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="选择税率" /></SelectTrigger>
                <SelectContent>
                  {['6', '9', '13'].map((r) => (
                    <SelectItem key={r} value={r}>{r}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.taxRate && (
                <p className="text-xs text-red-500">{form.formState.errors.taxRate.message}</p>
              )}
            </div>
          </div>

          {gross > 0 && (
            <div className="rounded-md bg-white/40 px-3 py-2 text-sm text-slate-600">
              不含税金额 <span className="font-medium tabular-nums">¥{formatMoney(net)}</span> · 税额{' '}
              <span className="font-semibold tabular-nums text-slate-900">¥{formatMoney(tax)}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>发票文件</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setInvoiceFile(f)
                e.target.value = ''
              }}
            />
            {invoiceFile ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-glass-border bg-white/40 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
                  <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="truncate">{invoiceFile.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">{(invoiceFile.size / 1024).toFixed(0)} KB</span>
                </span>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 shrink-0 px-0 text-slate-500" onClick={() => setInvoiceFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> 选择发票文件
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
