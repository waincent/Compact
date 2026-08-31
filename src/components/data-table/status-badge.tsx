import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const COLOR_MAP: Record<string, string> = {
  '1': 'bg-green-50 text-green-700 border-green-200', // 启用/正常/生效/进行中/待确认等
  '2': 'bg-blue-50 text-blue-700 border-blue-200',    // 已完成/验收/收款等
  '3': 'bg-amber-50 text-amber-700 border-amber-200', // 变更中/已作废等
  '4': 'bg-white/50 text-slate-600 border-glass-border',// 终止/结项等
  '0': 'bg-white/50 text-slate-500 border-glass-border',// 停用/作废
}

/** 按字典值渲染彩色状态标签 */
export function StatusBadge({
  value,
  label,
  className,
}: {
  value: string | number
  label: string
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn('font-normal', COLOR_MAP[String(value)] ?? 'bg-white/50 text-slate-600 border-glass-border', className)}>
      {label}
    </Badge>
  )
}
