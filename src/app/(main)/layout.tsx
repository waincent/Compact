import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  const payload = token ? await verifyToken(token) : null
  if (!payload) redirect('/login')

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, status: 1 },
    select: { id: true, name: true, username: true, role: true, companyId: true },
  })
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={{
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            companyId: user.companyId,
          }}
        />
        <main className="flex-1 overflow-x-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
