import { PageHeader } from '@/components/layout/page-header'

export default function ProfilePage() {
  return (
    <div>
      <PageHeader title="个人中心" description="个人信息与登录日志" />
      <div className="rounded-lg border-glass-border bg-white/40 p-12 text-center text-sm text-slate-500">
        个人中心 — 开发中,即将上线
      </div>
    </div>
  )
}
