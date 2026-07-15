# ==============================
# PROJECT BRIEF — UAEW App v2
# Criado: 2026-03-11 | Última revisão: 2026-03-11
# ==============================
#
# OBJECTIVO:
#   Sistema de gestão de logística e operações para eventos
#   de MMA. Gere pessoas, enrollments, voos, vistos, hotéis,
#   transporte, stats, música, tasks, pre-event e batches.
#   Usado internamente pela equipa de operações.
#
# STACK:
#   Next.js 16.1.4 (App Router, Turbopack), React 18+,
#   TypeScript, Tailwind CSS, shadcn/ui, Supabase (Auth,
#   PostgreSQL, Realtime, RPC), SWR, date-fns, Zod,
#   react-hook-form, Sonner, Vercel (deploy).
#
# ARQUITECTURA (resumo):
#   Monolito Next.js com App Router. Client components para
#   UI interactiva, Server components para layout. Supabase
#   como backend (sem API routes próprias, excepto proxy-image
#   e music-convert). Dashboard usa RPC para métricas
#   agregadas. Realtime via Supabase channels.
#
# ESTRUTURA DE DIRECTÓRIOS:
#   src/app/(auth)/         — login, callback
#   src/app/(dashboard)/    — todas as páginas protegidas
#   src/app/public/         — páginas públicas (staging, music)
#   src/components/         — UI por módulo
#   src/lib/services/       — lógica de dados (Supabase queries)
#   src/lib/validations/    — schemas Zod
#   src/hooks/              — use-user, use-permissions, use-auth, use-dashboard
#   src/types/              — tipos por módulo
#
# CONVENÇÕES:
#   Código em inglês. UI labels em inglês. Tabelas com prefixo
#   mma_. Tipos em ficheiros separados por módulo. Serviços
#   usam createClient() do browser. @ts-nocheck em serviços
#   complexos (dashboard, stats, pre-event). User usa
#   Antigravity como editor e prefere scripts de terminal.
#
# AMBIENTES:
#   Dev: localhost:3000 (pnpm dev)
#   Prod: Vercel (config em vercel.json)
#   DB: Supabase cloud (otqzzllevufcxbpeavmo.supabase.co)
#
# NOTAS:
#   Repo: github.com/DSciAILab/uaewapp_v2 (privado)
#   Banco tem 41 tabelas (script original tinha 27, restantes
#   criadas manualmente). Script 00_DATABASE_FOUNDATION.sql
#   está desactualizado.
#
# ==============================