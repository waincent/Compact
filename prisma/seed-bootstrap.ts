/**
 * 契通 Compact — 生产环境最小初始化脚本
 * 仅创建平台超管 admin(admin / admin123),不写入任何演示数据。
 * 幂等:已存在 admin 时跳过。
 * 运行: pnpm exec tsx prisma/seed-bootstrap.ts
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

process.loadEnvFile?.('.env')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (existing) {
    console.log('admin 用户已存在,跳过初始化')
    return
  }
  const hash = bcrypt.hashSync('admin123', 10)
  await prisma.user.create({
    data: { username: 'admin', passwordHash: hash, name: '系统管理员', role: 1, status: 1 },
  })
  console.log('✓ 已创建平台超管 admin(admin / admin123),登录后请在「用户管理」中尽快修改密码')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
