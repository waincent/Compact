import { defineConfig, env } from 'prisma/config'

try {
  process.loadEnvFile('.env')
} catch {
  // .env 不存在时忽略
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
})
