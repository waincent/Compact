import {
  LayoutDashboard,
  Building2,
  Users,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  children?: NavItem[]
}

/** 侧边导航(按设计文档信息架构;报表/系统管理为第二轮)。菜单不分级,全部平铺展示 */
export const NAV_ITEMS: NavItem[] = [
  { title: '首页', href: '/dashboard', icon: LayoutDashboard },
  { title: '公司管理', href: '/companies', icon: Building2 },
  { title: '用户管理', href: '/users', icon: Users },
  { title: '项目管理', href: '/projects', icon: FolderKanban },
]

export function findActiveMenu(pathname: string): { title: string } {
  for (const item of NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) return { title: item.title }
  }
  // 合同详情页从项目进入,无独立菜单,归属「项目管理」
  if (pathname.startsWith('/contracts')) return { title: '项目管理' }
  return { title: '' }
}
