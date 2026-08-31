import { prisma, type Prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth/session'
import { contractInCompany } from '@/lib/auth/authorize'
import { resolveCompanyContext } from '@/lib/auth/company-context'
import { withApi, ok } from '@/lib/response'
import { ApiError } from '@/lib/errors'

/** 合同下发票列表(详情 Tab 用) */
export const GET = withApi(async (req, ctx) => {
  const user = await requireUser()
  const { companyId } = await resolveCompanyContext(user)
  const { id } = await ctx.params
  const contractId = Number(id)

  const contract = await prisma.contract.findFirst({ where: { id: contractId, isDeleted: false } })
  if (!contract || !contractInCompany(contract, companyId)) throw new ApiError(404, '合同不存在')

  const where: Prisma.InvoiceWhereInput = { contractId, isDeleted: false }

  const list = await prisma.invoice.findMany({
    where,
    orderBy: { issueDate: 'desc' },
    include: {
      creator: { select: { name: true } },
      fileAttachment: { select: { id: true, originalName: true, fileSize: true, mimeType: true } },
    },
  })

  return ok(list.map((i) => ({
    id: i.id,
    contractId: i.contractId,
    invoiceCode: i.invoiceCode,
    invoiceNumber: i.invoiceNumber,
    amount: Number(i.amount),
    taxRate: i.taxRate,
    taxAmount: Number(i.taxAmount),
    totalAmountWithTax: Number(i.totalAmountWithTax),
    issueDate: i.issueDate,
    remark: i.remark,
    version: i.version,
    createdByName: i.creator?.name,
    fileAttachment: i.fileAttachment
      ? {
          id: i.fileAttachment.id,
          originalName: i.fileAttachment.originalName,
          fileSize: i.fileAttachment.fileSize,
          mimeType: i.fileAttachment.mimeType,
        }
      : null,
  })))
})
