'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Trash2, FileText, Plus, Wallet, Pencil, FileCheck2,
  ScrollText, Upload, Download, Loader2, Check, Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/data-table/empty-state'
import { ConfirmDialog } from '@/components/data-table/confirm-dialog'
import { PaymentFormDialog } from './payment-form-dialog'
import { InvoiceFormDialog } from './invoice-form-dialog'
import { AcceptanceFormDialog } from './acceptance-form-dialog'
import { ContractFormDialog } from '../contract-form-dialog'
import { useDicts } from '@/hooks/use-dicts'
import { api } from '@/lib/api-client'
import { toDateStr, cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'

interface Stats {
  receive: number; pay: number; invoiceOut: number; invoiceIn: number
  receivePercent: number; payPercent: number; invoiceOutPercent: number; invoiceInPercent: number
  total: number
}

interface ContractDetail {
  id: number; code: string; name: string
  projectId: number; partyAId: number; partyBId: number
  contractType: number; totalAmount: number
  signDate: string; startDate: string; endDate: string; version: number
  project?: { id: number; name: string; code: string }
  partyA?: { id: number; name: string }
  partyB?: { id: number; name: string }
  creator?: { id: number; name: string; username: string }
  stats: Stats
}

interface PaymentRow {
  id: number; amount: number
  recordDate: string; createdByName?: string
  voucherId?: number | null; voucherName?: string | null
}
interface InvoiceRow {
  id: number
  invoiceCode: string; invoiceNumber: string
  amount: number; taxRate: number; taxAmount: number; totalAmountWithTax: number
  issueDate: string
  createdByName?: string
  fileAttachment?: { id: number; originalName: string; fileSize: number; mimeType: string } | null
}
interface AcceptanceRow {
  id: number
  acceptDate: string
  createdAt: string
  createdByName?: string
  attachment?: { id: number; originalName: string; fileSize: number; mimeType: string } | null
}
interface ContractFileRow {
  id: number
  originalName: string
  fileSize: number
  mimeType: string
  createdAt: string
  createdByName?: string
}

export function ContractDetail({ contractId, companyId, canManage, canUpload, canManagePayment, canManageInvoice }: {
  contractId: number
  companyId: number | null
  canManage: boolean
  canUpload: boolean
  canManagePayment: boolean
  canManageInvoice: boolean
}) {
  const router = useRouter()
  const { getLabel } = useDicts(['contract_type'])
  const [detail, setDetail] = useState<ContractDetail | null>(null)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [acceptances, setAcceptances] = useState<AcceptanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [acceptanceOpen, setAcceptanceOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingPayment, setDeletingPayment] = useState<PaymentRow | null>(null)
  const [deleting, setDeleting] = useState<InvoiceRow | null>(null)
  const [deletingAcceptance, setDeletingAcceptance] = useState<AcceptanceRow | null>(null)
  const [contractFiles, setContractFiles] = useState<ContractFileRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [deletingFile, setDeletingFile] = useState<ContractFileRow | null>(null)
  const [tab, setTab] = useState('invoices')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [d, p, inv, acc, files] = await Promise.all([
        api.get<ContractDetail>(`/api/contracts/${contractId}`),
        api.get<PaymentRow[]>(`/api/contracts/${contractId}/payments`),
        api.get<InvoiceRow[]>(`/api/contracts/${contractId}/invoices`),
        api.get<AcceptanceRow[]>(`/api/contracts/${contractId}/acceptances`),
        api.get<ContractFileRow[]>(`/api/contracts/${contractId}/contract-files`),
      ])
      setDetail(d)
      setPayments(p)
      setInvoices(inv)
      setAcceptances(acc)
      setContractFiles(files)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [contractId, companyId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  async function onDeleteContract() {
    setActionLoading(true)
    try {
      await api.del(`/api/contracts/${contractId}`)
      toast.success('合同已删除')
      setDeleteOpen(false)
      router.push(`/projects/${detail?.projectId ?? ''}`)
    } catch (err) {
      toast.error((err as Error).message)
      setDeleteOpen(false)
    } finally {
      setActionLoading(false)
    }
  }

  async function onDeleteAcceptance() {
    if (!deletingAcceptance) return
    setActionLoading(true)
    try {
      await api.del(`/api/acceptances/${deletingAcceptance.id}`)
      toast.success('验收单据已删除')
      setDeletingAcceptance(null)
      loadAll()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setActionLoading(false)
    }
  }

  async function onUploadContractFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`/api/upload?businessType=contract&businessId=${contractId}`, {
          method: 'POST',
          body: form,
          cache: 'no-store',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message ?? '合同原件上传失败')
      }
      toast.success(`已上传 ${files.length} 份合同原件`)
      loadAll()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  async function onDeleteContractFile() {
    if (!deletingFile) return
    setActionLoading(true)
    try {
      await api.del(`/api/files/${deletingFile.id}`)
      toast.success('合同原件已删除')
      setDeletingFile(null)
      loadAll()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setActionLoading(false)
    }
  }

  async function onDeletePayment() {
    if (!deletingPayment) return
    setActionLoading(true)
    try {
      await api.del(`/api/payments/${deletingPayment.id}`)
      toast.success('资金记录已删除')
      setDeletingPayment(null)
      loadAll()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setActionLoading(false)
    }
  }

  async function onDeleteInvoice() {
    if (!deleting) return
    setActionLoading(true)
    try {
      await api.del(`/api/invoices/${deleting.id}`)
      toast.success('发票记录已删除')
      setDeleting(null)
      loadAll()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setActionLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    )
  }
  if (!detail) return <EmptyState title="合同不存在" />

  const d = detail
  const total = d.stats.total

  const progressItem = (label: string, percent: number, amount: number, stroke: string, text: string) => (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <ProgressRing percent={percent} stroke={stroke} text={text} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="mt-1 text-xs text-slate-500">
          已完成 <span className="font-medium tabular-nums text-slate-700">¥{formatMoney(amount)}</span>
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* 顶部导航与操作 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/projects/${d.projectId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> 返回项目
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-slate-400">{d.code}</span>
          {canManage && (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> 编辑合同
              </Button>
              <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> 删除合同
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{d.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <InfoItem label="所属项目" value={d.project ? d.project.name : '-'} />
          <InfoItem label="合同类型" value={getLabel('contract_type', d.contractType)} />
          <InfoItem label="合同金额" value={`¥${formatMoney(total)}`} highlight />
          <InfoItem label="创建人" value={d.creator?.name ?? '-'} />
          <InfoItem label="甲方" value={d.partyA?.name ?? '-'} />
          <InfoItem label="乙方" value={d.partyB?.name ?? '-'} />
          <InfoItem label="签订日期" value={toDateStr(d.signDate)} />
          <InfoItem label="合同期限" value={`${toDateStr(d.startDate)} ~ ${toDateStr(d.endDate)}`} />
        </CardContent>
      </Card>

      {/* 环形进度:资金方向由合同类型推导(销售=收款/开票、采购=付款/收票) */}
      <Card>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-2">
          {d.contractType === 1 && progressItem('收款进度', d.stats.receivePercent, d.stats.receive, 'stroke-green-500', 'text-green-600')}
          {d.contractType === 2 && progressItem('付款进度', d.stats.payPercent, d.stats.pay, 'stroke-amber-500', 'text-amber-600')}
          {d.contractType === 1 && progressItem('开票进度', d.stats.invoiceOutPercent, d.stats.invoiceOut, 'stroke-blue-500', 'text-blue-600')}
          {d.contractType === 2 && progressItem('收票进度', d.stats.invoiceInPercent, d.stats.invoiceIn, 'stroke-violet-500', 'text-violet-600')}
        </CardContent>
      </Card>

      {/* 页签:发票记录 / 资金记录 / 验收单据 / 合同原件 */}
      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList variant="line">
          <TabsTrigger value="invoices" className="gap-1.5 px-3 py-1.5">
            <FileText className="h-4 w-4" /> 发票记录
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 px-3 py-1.5">
            <Wallet className="h-4 w-4" /> 资金记录
          </TabsTrigger>
          <TabsTrigger value="acceptances" className="gap-1.5 px-3 py-1.5">
            <FileCheck2 className="h-4 w-4" /> 验收单据
          </TabsTrigger>
          <TabsTrigger value="contractFiles" className="gap-1.5 px-3 py-1.5">
            <ScrollText className="h-4 w-4" /> 合同原件
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <div className="mb-3 flex items-center justify-between">
            <div />
            {canManageInvoice && (
              <Button size="sm" onClick={() => setInvoiceOpen(true)}>
                <Plus className="h-4 w-4" /> 新增发票记录
              </Button>
            )}
          </div>
          <InvoiceTable
            rows={invoices}
            canManage={canManageInvoice}
            onDelete={setDeleting}
          />
        </TabsContent>

        <TabsContent value="payments">
          <div className="mb-3 flex items-center justify-between">
            <div />
            {canManagePayment && (
              <Button size="sm" onClick={() => setRecordOpen(true)}>
                <Plus className="h-4 w-4" /> 新增资金记录
              </Button>
            )}
          </div>
          {payments.length === 0 ? (
            <EmptyState title="暂无资金记录" description="点击右上角「新增资金记录」开始登记" />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>发生日期</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>凭证</TableHead>
                    {canManagePayment && <TableHead className="text-right">操作</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-slate-500">{toDateStr(p.recordDate)}</TableCell>
                      <TableCell className={cn('font-medium tabular-nums', d.contractType === 1 ? 'text-green-600' : 'text-amber-600')}>
                        {d.contractType === 1 ? '+' : '-'}¥{formatMoney(p.amount)}
                      </TableCell>
                      <TableCell>
                        {p.voucherId ? (
                          <Button nativeButton={false} variant="ghost" size="sm" className="h-8 max-w-[200px] px-2 text-slate-600" render={
                            <a href={`/api/files/${p.voucherId}`} target="_blank" rel="noreferrer" />
                          }>
                            <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{p.voucherName}</span>
                          </Button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      {canManagePayment && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:text-red-600" onClick={() => setDeletingPayment(p)}>
                            <Trash2 className="h-3.5 w-3.5" /> 删除
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="acceptances">
          <div className="mb-3 flex items-center justify-between">
            <div />
            {canUpload && (
              <Button size="sm" onClick={() => setAcceptanceOpen(true)}>
                <Plus className="h-4 w-4" /> 新增验收单
              </Button>
            )}
          </div>
          {acceptances.length === 0 ? (
            <EmptyState title="暂无验收单据" description="点击右上角「新增验收单」登记验收日期与验收单文件" />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>验收日期</TableHead>
                    <TableHead>验收单文件</TableHead>
                    <TableHead>登记人</TableHead>
                    <TableHead>登记时间</TableHead>
                    {canUpload && <TableHead className="text-right">操作</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acceptances.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{toDateStr(a.acceptDate)}</TableCell>
                      <TableCell>
                        {a.attachment ? (
                          <Button nativeButton={false} variant="ghost" size="sm" className="h-8 max-w-[240px] px-2 text-slate-600" render={
                            <a href={`/api/files/${a.attachment.id}`} target="_blank" rel="noreferrer" />
                          }>
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{a.attachment.originalName}</span>
                          </Button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">{a.createdByName ?? '-'}</TableCell>
                      <TableCell className="text-slate-500">{toDateStr(a.createdAt)}</TableCell>
                      {canUpload && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:text-red-600" onClick={() => setDeletingAcceptance(a)}>
                            <Trash2 className="h-3.5 w-3.5" /> 删除
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contractFiles">
          <div className="mb-3 flex items-center justify-between">
            <div />
            {canUpload && (
              <Button size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 上传合同原件
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
              onChange={onUploadContractFiles}
            />
          </div>
          {contractFiles.length === 0 ? (
            <EmptyState title="暂无合同原件" description="点击右上角「上传合同原件」上传合同扫描件、补充协议等文件" />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>文件名</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>上传人</TableHead>
                    <TableHead>上传时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractFiles.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="flex max-w-[300px] items-center gap-2 font-medium">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">{f.originalName}</span>
                      </TableCell>
                      <TableCell className="text-slate-500">{formatBytes(f.fileSize)}</TableCell>
                      <TableCell className="text-slate-500">{f.createdByName ?? '-'}</TableCell>
                      <TableCell className="text-slate-500">{toDateStr(f.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button nativeButton={false} variant="ghost" size="sm" className="h-8 px-2" render={
                          <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" />
                        }>
                          <Download className="h-3.5 w-3.5" /> 下载
                        </Button>
                        {canUpload && (
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:text-red-600" onClick={() => setDeletingFile(f)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

      </Tabs>

      {/* 新增资金 / 发票 */}
      <PaymentFormDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        contractId={contractId}
        onSaved={() => {
          setRecordOpen(false)
          loadAll()
        }}
      />

      <InvoiceFormDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        contractId={contractId}
        onSaved={() => {
          setInvoiceOpen(false)
          loadAll()
        }}
      />

      {/* 新增验收单据 */}
      <AcceptanceFormDialog
        open={acceptanceOpen}
        onOpenChange={setAcceptanceOpen}
        contractId={contractId}
        onSaved={() => {
          setAcceptanceOpen(false)
          loadAll()
        }}
      />

      {/* 编辑合同 */}
      {detail && (
        <ContractFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          editing={detail}
          onSaved={() => {
            setEditOpen(false)
            loadAll()
          }}
        />
      )}

      {/* 删除合同 */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除合同"
        description={detail ? `确定删除合同「${detail.name}」吗?该合同下的所有资金记录、发票记录、验收单据与合同原件将被一并删除,且无法恢复。` : ''}
        confirmText="删除"
        variant="danger"
        loading={actionLoading}
        onConfirm={onDeleteContract}
      />

      {/* 资金记录删除、发票删除 */}
      <ConfirmDialog
        open={Boolean(deletingPayment)}
        onOpenChange={(o) => !o && setDeletingPayment(null)}
        title="删除资金记录"
        description={deletingPayment ? `确定删除这笔 ¥${formatMoney(deletingPayment.amount)} 的资金记录吗?删除后不再计入合同进度,关联凭证一并删除。` : ''}
        confirmText="删除"
        variant="danger"
        loading={actionLoading}
        onConfirm={onDeletePayment}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="删除发票记录"
        description={deleting ? `确定删除发票记录「${deleting.invoiceCode ?? ''}${deleting.invoiceNumber}」吗?删除后不再计入合同进度。` : ''}
        confirmText="删除"
        variant="danger"
        loading={actionLoading}
        onConfirm={onDeleteInvoice}
      />

      {/* 删除验收单据 */}
      <ConfirmDialog
        open={Boolean(deletingAcceptance)}
        onOpenChange={(o) => !o && setDeletingAcceptance(null)}
        title="删除验收单据"
        description={deletingAcceptance ? `确定删除${toDateStr(deletingAcceptance.acceptDate)}的验收单据吗?${deletingAcceptance.attachment ? '关联的验收单文件将一并删除。' : ''}` : ''}
        confirmText="删除"
        variant="danger"
        loading={actionLoading}
        onConfirm={onDeleteAcceptance}
      />

      {/* 删除合同原件 */}
      <ConfirmDialog
        open={Boolean(deletingFile)}
        onOpenChange={(o) => !o && setDeletingFile(null)}
        title="删除合同原件"
        description={deletingFile ? `确定删除合同原件「${deletingFile.originalName}」吗?` : ''}
        confirmText="删除"
        variant="danger"
        loading={actionLoading}
        onConfirm={onDeleteContractFile}
      />
    </div>
  )
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cn('mt-0.5', highlight ? 'text-base font-semibold text-primary' : 'text-slate-700')}>{value}</p>
    </div>
  )
}

/** 圆形进度环:未完成时圆心显示百分比,100% 时圆心显示对勾 */
function ProgressRing({ percent, stroke, text, size = 64 }: { percent: number; stroke: string; text: string; size?: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)))
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  const done = pct >= 100
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={10} className="stroke-slate-200" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          className={`${stroke} transition-all duration-500`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {done ? (
          <Check className={`h-6 w-6 ${text}`} strokeWidth={3} />
        ) : (
          <span className={`text-sm font-semibold tabular-nums ${text}`}>{pct}%</span>
        )}
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function InvoiceTable({ rows, canManage, onDelete }: {
  rows: InvoiceRow[]
  canManage: boolean
  onDelete: (inv: InvoiceRow) => void
}) {
  if (rows.length === 0) return <EmptyState title="暂无发票记录" />
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>开票日期</TableHead>
            <TableHead>发票号码</TableHead>
            <TableHead>含税金额</TableHead>
            <TableHead>税率</TableHead>
            <TableHead>不含税金额</TableHead>
            <TableHead>税额</TableHead>
            <TableHead>发票文件</TableHead>
            {canManage && <TableHead className="text-right">操作</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="text-slate-500">{toDateStr(inv.issueDate)}</TableCell>
              <TableCell className="font-mono text-xs text-slate-600">
                {inv.invoiceCode}{inv.invoiceNumber}
              </TableCell>
              <TableCell className="font-medium tabular-nums">¥{formatMoney(inv.totalAmountWithTax)}</TableCell>
              <TableCell className="text-slate-500">{inv.taxRate}%</TableCell>
              <TableCell className="tabular-nums">¥{formatMoney(inv.amount)}</TableCell>
              <TableCell className="tabular-nums">¥{formatMoney(inv.taxAmount)}</TableCell>
              <TableCell>
                {inv.fileAttachment ? (
                  <Button nativeButton={false} variant="ghost" size="sm" className="h-8 max-w-[220px] px-2 text-slate-600" render={
                    <a href={`/api/files/${inv.fileAttachment.id}`} target="_blank" rel="noreferrer" />
                  }>
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{inv.fileAttachment.originalName}</span>
                  </Button>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-red-600" onClick={() => onDelete(inv)}>
                      <Trash2 className="h-3.5 w-3.5" /> 删除
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
