import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt'

/**
 * JWT 路由保护(Next 16 proxy 约定):
 * - 未登录访问受保护页面 → 重定向 /login
 * - 已登录访问 /login → 重定向 /dashboard
 * 数据级权限(行级过滤/写操作)在 API 层强制,此处仅做登录拦截
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(COOKIE_NAME)?.value
  const hasToken = Boolean(token)

  const isLoginPage = pathname === '/login'

  if (!hasToken && !isLoginPage) {
    const url = new URL('/login', req.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }
  if (hasToken && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  return NextResponse.next()
}

export const config = {
  // 排除 /api(由 API 层自行鉴权返回 401)与静态资源
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
