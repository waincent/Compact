'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Landmark } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-client'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

interface DashboardData {
  stats: {
    activeContractCount: number
    contractTotal: number
    draftCount: number
    changingCount: number
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
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] w-full" />
        ))}
      </div>
    )
  }

  const { stats } = data

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>
    </div>
  )
}
