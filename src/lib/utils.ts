import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Date / ISO 字符串 → YYYY-MM-DD(时区安全,按本地时区) */
export function toDateStr(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 今天(YYYY-MM-DD) */
export function today(): string {
  return toDateStr(new Date())
}

/** 距今天 N 天的日期 */
export function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}
