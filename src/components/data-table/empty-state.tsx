import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
}

export function EmptyState({
  title = '暂无数据',
  description = '点击右上角按钮开始创建',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/50">
        <Inbox className="h-7 w-7 text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  )
}
