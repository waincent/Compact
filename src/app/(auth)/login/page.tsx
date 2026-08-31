'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-slate-500">加载中…</div>}>
      <LoginContent />
    </Suspense>
  )
}

interface LoginUser {
  id: number
  username: string
  name: string
  companyName?: string | null
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')

  const [users, setUsers] = useState<LoginUser[]>([])
  const [loaded, setLoaded] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    api
      .get<{ users: LoginUser[] }>('/api/auth/login-options')
      .then((d) => setUsers(d.users))
      .catch(() => {
        setError('加载登录选项失败,请刷新重试')
      })
      .finally(() => setLoaded(true))
  }, [])

  const selectedUser = users.find((u) => u.username === username) ?? null

  function onAccountChange(v: string | null) {
    setUsername(v ?? '')
    setPassword('')
    setError('')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!username) {
      setError('请选择账号')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }
    try {
      await api.post('/api/auth/login', {
        username,
        password,
        remember,
      })
      toast.success('登录成功')
      startTransition(() => {
        router.push(from || '/dashboard')
        router.refresh()
      })
    } catch (err) {
      const msg = (err as Error).message
      setError(msg)
      toast.error(msg)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5e5ce6] to-[#0a84ff] text-white shadow-[0_4px_16px_rgba(10,132,255,0.4)]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">契通 Compact</h1>
            <p className="mt-1 text-sm text-slate-500">项目合同管理系统</p>
          </div>
        </div>

        <div className="rounded-2xl border-glass-border bg-white/65 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_30px_rgba(15,23,42,0.1)] backdrop-blur-xl">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="account">账号</Label>
              <Select
                value={username}
                onValueChange={onAccountChange}
                disabled={!loaded || users.length === 0}
              >
                <SelectTrigger
                  id="account"
                  className="w-full rounded-lg px-3 text-slate-900 data-[size=default]:h-11 data-placeholder:text-slate-500"
                >
                  {selectedUser && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#0a84ff] text-[11px] font-semibold text-white">
                      {selectedUser.name.slice(0, 1)}
                    </span>
                  )}
                  <SelectValue
                    placeholder={!loaded ? '加载中…' : users.length === 0 ? '暂无可用账号' : '请选择账号'}
                  />
                </SelectTrigger>
                <SelectContent className="p-1.5">
                  {users.map((u) => (
                    <SelectItem
                      key={u.id}
                      value={u.username}
                      label={`${u.name} @${u.username}`}
                      className="gap-3 py-2.5 pr-9 pl-3"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          username === u.username
                            ? 'bg-gradient-to-br from-[#5e5ce6] to-[#0a84ff] text-white'
                            : 'bg-white/60 text-slate-600'
                        }`}
                      >
                        {u.name.slice(0, 1)}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium text-slate-900">{u.name}</span>
                        <span className="truncate text-xs text-slate-500">
                          @{u.username}
                          {u.companyName ? ` · ${u.companyName}` : ''}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  className="pr-10"
                  disabled={!username}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-600"
                  aria-label={showPwd ? '隐藏密码' : '显示密码'}
                  disabled={!username}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                记住我
              </label>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={isPending || !username}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '登 录'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
