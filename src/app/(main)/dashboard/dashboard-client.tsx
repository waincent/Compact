'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  FileText, Landmark, FolderKanban, TrendingUp, ShoppingCart, Receipt, ReceiptText, PiggyBank, Banknote,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-client'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

interface DashboardData {
  stats: {
    activeProjectCount: number
    activeContractCount: number
    contractTotal: number
    salesTotal: number
    purchaseTotal: number
    invoiceOutTotal: number
    invoiceInTotal: number
    leftoverTax: number
    paidTax: number
  }
}

function StatCard({
  title, value, sub, icon: Icon, iconClass,
}: {
  title: string
  value: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg', iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardClient({ companyId }: { companyId: number | null }) {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    setData(null)
    api
      .get<DashboardData>('/api/dashboard')
      .then(setData)
      .catch((err) => toast.error((err as Error).message))
  }, [companyId])

  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] w-full" />
        ))}
      </div>
    )
  }

  const { stats } = data

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="项目数量"
        value={`${stats.activeProjectCount} 个`}
        sub="全部未删除项目"
        icon={FolderKanban}
        iconClass="bg-amber-50 text-amber-600"
      />
      <StatCard
        title="合同数量"
        value={`${stats.activeContractCount} 份`}
        sub="全部未删除合同"
        icon={FileText}
        iconClass="bg-blue-50 text-blue-600"
      />
      <StatCard
        title="合同总金额"
        value={`¥${formatMoney(stats.contractTotal)}`}
        sub="全部未删除合同合计"
        icon={Landmark}
        iconClass="bg-indigo-50 text-indigo-600"
      />
      <StatCard
        title="销售总金额"
        value={`¥${formatMoney(stats.salesTotal)}`}
        sub="销售类合同金额合计"
        icon={TrendingUp}
        iconClass="bg-emerald-50 text-emerald-600"
      />
      <StatCard
        title="采购总金额"
        value={`¥${formatMoney(stats.purchaseTotal)}`}
        sub="采购类合同金额合计"
        icon={ShoppingCart}
        iconClass="bg-rose-50 text-rose-600"
      />
      <StatCard
        title="开票总金额"
        value={`¥${formatMoney(stats.invoiceOutTotal)}`}
        sub="销售合同已开票(价税合计)"
        icon={Receipt}
        iconClass="bg-purple-50 text-purple-600"
      />
      <StatCard
        title="收票总金额"
        value={`¥${formatMoney(stats.invoiceInTotal)}`}
        sub="采购合同已收票(价税合计)"
        icon={ReceiptText}
        iconClass="bg-teal-50 text-teal-600"
      />
      <StatCard
        title="留底税额"
        value={`¥${formatMoney(stats.leftoverTax)}`}
        sub="收票税额大于开票税额部分"
        icon={PiggyBank}
        iconClass="bg-orange-50 text-orange-600"
      />
      <StatCard
        title="已交纳税额"
        value={`¥${formatMoney(stats.paidTax)}`}
        sub="开票税额大于收票税额部分"
        icon={Banknote}
        iconClass="bg-cyan-50 text-cyan-600"
      />
    </div>
  )
}
