import { ApiError } from '@/lib/errors'

/** 统一金额类型:Prisma 的 Decimal 转 number */
export function toNumber(v: { toString(): string } | number | string | null | undefined): number {
  if (v == null || v === '') return 0
  return typeof v === 'number' ? v : Number(v)
}

/** 不含税金额 + 税率 → {税额, 价税合计} */
export function calcTax(amount: number, rate: number): { tax: number; total: number } {
  const tax = Math.round(amount * rate) / 100
  return { tax, total: amount + tax }
}

/** 含税金额 + 税率 → {不含税金额, 税额}(含税 = 不含税 × (1 + 税率/100),反向于 calcTax) */
export function calcFromGross(gross: number, rate: number): { amount: number; tax: number } {
  const amount = Math.round((gross * 10000) / (100 + rate)) / 100
  const tax = Math.round((gross - amount) * 100) / 100
  return { amount, tax }
}

/**
 * 合同金额强校验:同方向累计 + 本次 ≤ 合同总额
 * @throws ApiError(400)
 */
export function assertContractAmount(opts: {
  contractTotal: number
  sameDirectionSum: number
  incoming: number
}): void {
  const { contractTotal, sameDirectionSum, incoming } = opts
  if (sameDirectionSum + incoming > contractTotal) {
    const exceed = sameDirectionSum + incoming - contractTotal
    throw new ApiError(400, `超出合同金额 ${exceed.toFixed(2)} 元,请确认`)
  }
}

/** 金额格式化(千分位 + 两位小数) */
export function formatMoney(n: number): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}
