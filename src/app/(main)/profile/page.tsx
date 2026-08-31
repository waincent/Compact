import { PageHeader } from '@/components/layout/page-header'

export default function ProfilePage() {
  return (
    <div>
      <PageHeader title="个人中心" description="个人信息与登录日志" />
      <div className="rounded-lg border border-dashed bg-white p-12 text-center text-sm text-slate-400">
        个人中心 — 开发中,即将上线
      </div>
    </div>
  )
}
