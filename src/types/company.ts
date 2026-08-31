/** 公司实体(列表与表单共用) */
export interface Company {
  id: number
  name: string
  creditCode: string | null
  address: string | null
  phone: string | null
  contactName: string | null
  contactPhone: string | null
  bankName: string | null
  bankAccount: string | null
  remark: string | null
  status: number
  createdByName?: string
  createdAt: string
}
