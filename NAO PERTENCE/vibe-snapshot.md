# VIBE Snapshot

Projeto: uaewapp_v2
Gerado em (UTC): 2026-01-24T20:52:08.833Z
VIBE alvo: 5.0.2

## Stack
- Runtime: node
- Package manager: pnpm
- Framework: next 16.1.4
- Supabase: sim
- @supabase/ssr: ^0.8.0

## Git
- Repo: sim
- Branch: main
- Head: bdf796cc9c5a6c299f20b9a091e9c89570123d73
- Dirty: true

## Inventário
- Dirs count: 42
- Files count: 179
- Files sample: docs/database/00_DATABASE_FOUNDATION.sql, docs/migrations/002_fix_hotels_schema.sql, docs/prompts/1 copy 9, docs/prompts/SPRINT_00_PROMPT.md, docs/prompts/SPRINT_01_PROMPT.md, docs/prompts/SPRINT_02_PROMPT.md, docs/prompts/SPRINT_03_PROMPT.md, docs/prompts/SPRINT_04_PROMPT.md, docs/prompts/SPRINT_05_PROMPT.md, docs/prompts/SPRINT_06_PROMPT.md, docs/prompts/SPRINT_07_PROMPT.md, docs/prompts/SPRINT_08_PROMPT.md, docs/01_PROJECT_DOCUMENTATION.md, docs/02_SECURITY_CHECKLIST.md, docs/03_EXECUTION_PLAN.md, docs/04_ANTIGRAVITY_PROMPTS.md, docs/05_EXECUTOR_PROMPT.md, docs/EXECUTION_STATUS.md, docs/SPRINT_00_REPORT.md, docs/SPRINT_03_REPORT.md, docs/SPRINT_04_REPORT.md, public/file.svg, public/globe.svg, public/next.svg, public/vercel.svg, public/window.svg, src/app/(auth)/callback/route.ts, src/app/(auth)/login/page.tsx, src/app/(dashboard)/dashboard/page.tsx, src/app/(dashboard)/events/page.tsx, src/app/(dashboard)/flights/page.tsx, src/app/(dashboard)/hotels/page.tsx, src/app/(dashboard)/people/page.tsx, src/app/(dashboard)/visas/page.tsx, src/app/(dashboard)/layout.tsx, src/app/favicon.ico, src/app/globals.css, src/app/layout.tsx, src/app/page.tsx, src/components/batches/batch-assignment.tsx, src/components/batches/batch-card.tsx, src/components/batches/batch-form.tsx, src/components/batches/batch-status-badge.tsx, src/components/batches/batch-timeline.tsx, src/components/batches/batch-type-badge.tsx, src/components/dashboard/activity-summary.tsx, src/components/dashboard/metrics-grid.tsx, src/components/dashboard/progress-widget.tsx, src/components/dashboard/quick-actions.tsx, src/components/dashboard/status-card.tsx

## Next routes (amostra)
- app pages: 
- app routes: 
- pages api: 

## Supabase migrations
- Present: false
- Count: 0
- Sample: 

## Saídas
- Summary: vibe-snapshot-summary.json
- Evidence: vibe-snapshot-evidence.jsonl
- Markdown: vibe-snapshot.md

## Como usar no VIBE
1. Cole o conteúdo de vibe-snapshot-summary.json na LLM para iniciar auditoria.
2. Quando o VIBE pedir evidência, busque no vibe-snapshot-evidence.jsonl por file e pattern_id.
3. Se precisar de mais evidência, rode de novo com --maxDepth maior ou --includeFullFor para arquivos específicos.