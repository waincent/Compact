/**
 * 契通 Compact — 演示数据种子脚本
 * 运行: pnpm prisma db seed   (或 node --import tsx prisma/seed.ts)
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

process.loadEnvFile?.('.env')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const d = (days: number): Date => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
}

async function main() {
  console.log('=== 开始种子数据写入 ===')

  // 1. 清空旧数据(FK 安全顺序)
  await prisma.invoice.deleteMany()
  await prisma.paymentRecord.deleteMany()
  await prisma.contract.deleteMany()
  await prisma.project.deleteMany()
  await prisma.company.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.operationLog.deleteMany()
  await prisma.loginLog.deleteMany()
  await prisma.sysDict.deleteMany()
  await prisma.sysParam.deleteMany()
  await prisma.sequence.deleteMany()
  await prisma.user.deleteMany()

  // 2. 用户(admin 为平台超管不归属公司;先建公司再建各公司账号)
  const hash = bcrypt.hashSync('admin123', 10)
  const admin = await prisma.user.create({ data: { username: 'admin', passwordHash: hash, name: '系统管理员', role: 1 } })
  const ownCo = await prisma.company.create({ data: { name: '示例科技有限公司', creditCode: '91310000MA1EXAMPLE1', address: '广东省深圳市南山区科技园南路 88 号', phone: '0755-88886666', contactName: '陈总', contactPhone: '13800000001', bankName: '招商银行深圳分行', bankAccount: '755900000000001', createdBy: admin.id } })
  const hwCo = await prisma.company.create({ data: { name: '华为技术有限公司', creditCode: '91440300708121892P', address: '广东省深圳市龙岗区坂田华为基地', phone: '0755-28780808', contactName: '赵经理', contactPhone: '13800000004', createdBy: admin.id } })
  const manager1 = await prisma.user.create({ data: { username: 'manager1', passwordHash: hash, name: '王经理', role: 2, companyId: ownCo.id } })
  const finance1 = await prisma.user.create({ data: { username: 'finance1', passwordHash: hash, name: '李财务', role: 3, companyId: ownCo.id } })
  const member1 = await prisma.user.create({ data: { username: 'member1', passwordHash: hash, name: '张成员', role: 4, companyId: hwCo.id } })
  console.log(`用户: admin(平台/全部) + manager1/finance1(本公司) + member1(华为) 密码均 admin123`)
  const txCo = await prisma.company.create({ data: { name: '腾讯科技(深圳)有限公司', creditCode: '91440300708986302C', address: '广东省深圳市南山区海天二路 33 号', phone: '0755-86013388', contactName: '李经理', contactPhone: '13800000002', createdBy: admin.id } })
  const alCo = await prisma.company.create({ data: { name: '阿里云计算有限公司', creditCode: '91330106MA27W0MY8B', address: '浙江省杭州市余杭区文一西路 969 号', phone: '0571-85022088', contactName: '王经理', contactPhone: '13800000003', createdBy: admin.id } })
  const zrCo = await prisma.company.create({ data: { name: '中软国际有限公司', creditCode: '914403001927777333', address: '北京市海淀区中关村软件园二期', phone: '010-82493888', contactName: '孙经理', contactPhone: '13800000005', createdBy: admin.id } })
  const rtCo = await prisma.company.create({ data: { name: '软通动力信息技术公司', creditCode: '91110000MA01ABC123', address: '北京市海淀区西北旺东路 10 号', phone: '010-62629888', contactName: '周经理', contactPhone: '13800000006', createdBy: admin.id } })
  const nsCo = await prisma.company.create({ data: { name: '深圳南山云计算产业园', creditCode: '91440300MA5XYZ7890', address: '广东省深圳市南山区南山大道 1001 号', phone: '0755-26019999', contactName: '吴主任', contactPhone: '13800000007', createdBy: admin.id } })
  console.log('公司: 7家(示例科技/华为/腾讯/阿里/中软/软通/南山产业园)')

  // 4. 项目
  const p1 = await prisma.project.create({ data: { code: 'XM-2026-001', name: '智慧城市数据平台项目', description: '为某市构建城市级数据汇聚与治理平台', status: 1, startDate: d(-180), endDate: d(45), createdBy: admin.id } })
  const p2 = await prisma.project.create({ data: { code: 'XM-2026-002', name: '企业ERP实施项目', description: '大型制造企业ERP系统实施与定制', status: 1, startDate: d(-150), endDate: d(-15), createdBy: admin.id } })
  const p3 = await prisma.project.create({ data: { code: 'XM-2026-003', name: '电商平台重构项目', description: '核心电商业务系统微服务化重构', status: 2, startDate: d(-120), endDate: d(20), createdBy: admin.id } })
  const p4 = await prisma.project.create({ data: { code: 'XM-2026-004', name: '智能仓储系统项目', description: '智能仓储物流调度系统建设', status: 2, startDate: d(-365), endDate: d(-60), createdBy: admin.id } })
  const p5 = await prisma.project.create({ data: { code: 'XM-2026-005', name: '移动办公App项目', description: '企业内部移动办公协同App', status: 1, startDate: d(0), endDate: d(120), createdBy: admin.id } })
  console.log('项目: 5个(含 1 个延期预警 XM-2026-002)')

  // 5. 合同(金额/到期日覆盖各类场景)
  const c1 = await prisma.contract.create({ data: { code: 'HT-2026-001', name: '智慧城市平台开发服务合同', projectId: p1.id, partyAId: txCo.id, partyBId: ownCo.id, contractType: 1, totalAmount: 1000000, signDate: d(-180), startDate: d(-180), endDate: d(30), createdBy: admin.id } })
  const c2 = await prisma.contract.create({ data: { code: 'HT-2026-002', name: 'ERP实施服务合同', projectId: p2.id, partyAId: alCo.id, partyBId: ownCo.id, contractType: 1, totalAmount: 500000, signDate: d(-150), startDate: d(-150), endDate: d(15), createdBy: admin.id } })
  const c3 = await prisma.contract.create({ data: { code: 'HT-2026-003', name: '电商平台开发合同', projectId: p3.id, partyAId: hwCo.id, partyBId: ownCo.id, contractType: 1, totalAmount: 800000, signDate: d(-120), startDate: d(-120), endDate: d(7), createdBy: admin.id } })
  const c4 = await prisma.contract.create({ data: { code: 'HT-2026-004', name: '智能仓储系统采购合同', projectId: p4.id, partyAId: ownCo.id, partyBId: zrCo.id, contractType: 2, totalAmount: 300000, signDate: d(-300), startDate: d(-300), endDate: d(3), createdBy: admin.id } })
  const c5 = await prisma.contract.create({ data: { code: 'HT-2026-005', name: '移动App设计服务合同', projectId: p5.id, partyAId: nsCo.id, partyBId: ownCo.id, contractType: 1, totalAmount: 200000, signDate: d(0), startDate: d(0), endDate: d(120), createdBy: member1.id } })
  const c6 = await prisma.contract.create({ data: { code: 'HT-2026-006', name: '云资源采购合同', projectId: p1.id, partyAId: ownCo.id, partyBId: rtCo.id, contractType: 2, totalAmount: 150000, signDate: d(-90), startDate: d(-90), endDate: d(-10), createdBy: admin.id } })
  const c7 = await prisma.contract.create({ data: { code: 'HT-2026-007', name: '大数据分析平台合同', projectId: p2.id, partyAId: txCo.id, partyBId: ownCo.id, contractType: 1, totalAmount: 600000, signDate: d(-400), startDate: d(-400), endDate: d(-300), createdBy: admin.id } })
  const c8 = await prisma.contract.create({ data: { code: 'HT-2026-008', name: '安全加固服务合同', projectId: p3.id, partyAId: hwCo.id, partyBId: ownCo.id, contractType: 1, totalAmount: 250000, signDate: d(-30), startDate: d(-30), endDate: d(45), createdBy: manager1.id } })
  console.log('合同: 8个(到期 3/7/15/30/45 天)')

  // 6. 资金记录(收款/付款由合同类型推导:销售合同=收款、采购合同=付款)
  const pay1 = await prisma.paymentRecord.create({ data: { contractId: c1.id, amount: 300000, recordDate: d(-90), createdBy: admin.id } })
  const pay2 = await prisma.paymentRecord.create({ data: { contractId: c1.id, amount: 200000, recordDate: d(-60), createdBy: admin.id } })
  const pay3 = await prisma.paymentRecord.create({ data: { contractId: c1.id, amount: 400000, recordDate: d(-30), createdBy: admin.id } })
  await prisma.paymentRecord.create({ data: { contractId: c2.id, amount: 200000, recordDate: d(-90), createdBy: admin.id } })
  await prisma.paymentRecord.create({ data: { contractId: c2.id, amount: 100000, recordDate: d(-20), createdBy: admin.id } })
  await prisma.paymentRecord.create({ data: { contractId: c3.id, amount: 300000, recordDate: d(-80), createdBy: admin.id } })
  await prisma.paymentRecord.create({ data: { contractId: c3.id, amount: 200000, recordDate: d(-40), createdBy: admin.id } })
  await prisma.paymentRecord.create({ data: { contractId: c4.id, amount: 100000, recordDate: d(-200), createdBy: admin.id } })
  await prisma.paymentRecord.create({ data: { contractId: c4.id, amount: 100000, recordDate: d(-30), createdBy: admin.id } })
  await prisma.paymentRecord.create({ data: { contractId: c6.id, amount: 100000, recordDate: d(-60), createdBy: admin.id } })
  await prisma.paymentRecord.create({ data: { contractId: c8.id, amount: 250000, recordDate: d(-10), createdBy: admin.id } })
  console.log('资金记录: 11笔')

  // 7. 发票(销项/进项)
  const inv1 = await prisma.invoice.create({ data: { contractId: c1.id, invoiceCode: '031002600111', invoiceNumber: '031202600000001', amount: 200000, taxRate: 13, taxAmount: 26000, totalAmountWithTax: 226000, issueDate: d(-58), status: 1, createdBy: admin.id } })
  const inv2 = await prisma.invoice.create({ data: { contractId: c1.id, invoiceCode: '031002600111', invoiceNumber: '031202600000002', amount: 400000, taxRate: 13, taxAmount: 52000, totalAmountWithTax: 452000, issueDate: d(-28), status: 1, createdBy: admin.id } })
  const inv3 = await prisma.invoice.create({ data: { contractId: c1.id, invoiceCode: '031002600111', invoiceNumber: '031202600000003', amount: 100000, taxRate: 13, taxAmount: 13000, totalAmountWithTax: 113000, issueDate: d(-10), status: 1, createdBy: admin.id } })
  const inv4 = await prisma.invoice.create({ data: { contractId: c1.id, invoiceCode: '031002600111', invoiceNumber: '031202600000004', amount: 80000, taxRate: 6, taxAmount: 4800, totalAmountWithTax: 84800, issueDate: d(-50), status: 1, createdBy: admin.id } })
  await prisma.invoice.create({ data: { contractId: c2.id, invoiceCode: '031002600222', invoiceNumber: '031202600000005', amount: 100000, taxRate: 13, taxAmount: 13000, totalAmountWithTax: 113000, issueDate: d(-80), status: 1, createdBy: admin.id } })
  await prisma.invoice.create({ data: { contractId: c3.id, invoiceCode: '031002600333', invoiceNumber: '031202600000006', amount: 200000, taxRate: 13, taxAmount: 26000, totalAmountWithTax: 226000, issueDate: d(-70), status: 1, createdBy: admin.id } })
  await prisma.invoice.create({ data: { contractId: c4.id, invoiceCode: '031002600444', invoiceNumber: '031202600000007', amount: 100000, taxRate: 13, taxAmount: 13000, totalAmountWithTax: 113000, issueDate: d(-180), status: 1, createdBy: admin.id } })
  console.log('发票: 7张(销售合同发票6 + 采购合同发票1)')

  // 8. 数据字典
  const dictSeed: { type: string; items: [string, string][] }[] = [
    { type: 'company_status', items: [['1', '正常'], ['0', '停用']] },
    { type: 'project_status', items: [['1', '进行中'], ['2', '结项']] },
    { type: 'contract_type', items: [['1', '销售'], ['2', '采购']] },
    { type: 'invoice_status', items: [['1', '已开票']] },
    { type: 'user_role', items: [['1', '超级管理员'], ['2', '管理员'], ['3', '财务'], ['4', '普通成员']] },
    { type: 'user_status', items: [['1', '启用'], ['0', '停用']] },
  ]
  for (const group of dictSeed) {
    await prisma.sysDict.createMany({
      data: group.items.map(([value, label], i) => ({
        dictType: group.type, dictLabel: label, dictValue: value, sortOrder: i,
      })),
    })
  }
  console.log('数据字典: 8 类')

  // 9. 业务编号序列
  await prisma.sequence.createMany({
    data: [
      { bizKey: 'XM-2026', seq: 5 },
      { bizKey: 'HT-2026', seq: 8 },
    ],
  })
  console.log('编号序列: XM-2026=5, HT-2026=8')

  console.log('=== 种子数据完成 ===')
  console.log('登录账号: admin / manager1 / finance1 / member1,密码均为 admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
