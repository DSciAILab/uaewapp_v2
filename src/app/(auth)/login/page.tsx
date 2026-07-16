'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { StatusDot } from '@/components/ui/status-dot'
import { EventCountdown } from '@/components/ui/event-countdown'
import { toast } from 'sonner'
import { Swords } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/callback`,
          },
        })
        if (error) throw error
        toast.success('Cadastro iniciado! Verifique seu email para confirmar.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro na autenticação')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login com Google')
      setLoading(false)
    }
  }

  // 7 days out from "now" — placeholder event for the design
  const demoEventDate = new Date()
  demoEventDate.setDate(demoEventDate.getDate() + 7)

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left operational panel — visible only on lg+ */}
      <aside className="hidden lg:flex flex-col w-[44%] xl:w-[40%] bg-surface-1/40 border-r border-border/60 relative overflow-hidden">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />

        {/* Top status bar */}
        <div className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary/15 border border-primary/30">
              <Swords className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold text-sm tracking-tight">UAEW</span>
            <span className="label-mono">/ ops</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot status="confirmed" size="sm" />
            <span className="label-mono">All systems</span>
          </div>
        </div>

        {/* Operational content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-8 xl:px-12 py-8 gap-6">
          <div>
            <p className="label-mono text-primary mb-2">Active event</p>
            <h1 className="font-display text-3xl xl:text-4xl font-semibold tracking-tight text-foreground leading-tight">
              War Room
              <br />
              <span className="text-muted-foreground">for live operations</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-4 max-w-md">
              Walkouts, transport, medical, visas, attendance — one console for the team
              running event-day.
            </p>
          </div>

          <EventCountdown
            targetDate={demoEventDate}
            eventName="UAE Warriors 71"
            eventCode="UAEW-71 · Etihad Arena"
            className="max-w-md"
          />

          <div className="grid grid-cols-3 gap-2 max-w-md">
            {[
              { label: 'Fighters', value: '24', status: 'confirmed' as const },
              { label: 'Flights', value: '18', status: 'pending' as const },
              { label: 'Tasks', value: '7', status: 'warning' as const },
            ].map((stat) => (
              <div
                key={stat.label}
                className="grid-cell rounded-md p-3 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="label-mono">{stat.label}</span>
                  <StatusDot status={stat.status} size="sm" />
                </div>
                <span className="numeric text-2xl font-semibold tracking-tight">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom command hint */}
        <div className="relative z-10 flex items-center justify-between px-8 py-4 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
          <span>⌘K · command palette</span>
          <span className="numeric">v0.1.0 · build 2026.07.16</span>
        </div>
      </aside>

      {/* Right form panel */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-grid">
        <div className="w-full max-w-sm">
          {/* Mobile-only brand */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/15 border border-primary/30">
              <Swords className="h-4 w-4 text-primary" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold tracking-tight">UAEW</span>
          </div>

          <div className="mb-8">
            <p className="label-mono text-primary mb-2">Sign in</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {isSignUp ? 'Create account' : 'Access console'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              {isSignUp
                ? 'Request access from your team lead.'
                : 'Use your ops credentials.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="label-mono">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ops@uaewarriors.ae"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="label-mono">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="font-mono"
              />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading
                ? isSignUp
                  ? 'Creating…'
                  : 'Authenticating…'
                : isSignUp
                ? 'Create account'
                : 'Sign in'}
            </Button>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              {isSignUp ? '→ Back to sign in' : '→ Request access'}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-wider">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="mr-2 h-3.5 w-3.5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        </div>
      </main>
    </div>
  )
}
