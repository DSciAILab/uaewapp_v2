# 🥊 MMA Event Management System

Sistema de gestão de logística e operações para eventos de MMA, substituindo planilhas complexas por uma solução centralizada com real-time, permissões granulares e dashboards para Sala de Guerra.

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- pnpm (recomendado) ou npm
- Conta no [Supabase](https://supabase.com)
- Conta no [Vercel](https://vercel.com) (para deploy)
- Conta no [GitHub](https://github.com)

### Passo 1: Configurar o Banco de Dados

⚠️ **FAÇA ISSO PRIMEIRO, ANTES DE QUALQUER CÓDIGO**

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Copie o conteúdo de `docs/database/00_DATABASE_FOUNDATION.sql`
4. Cole e clique em **Run**
5. Aguarde a mensagem "✅ VERIFICAÇÃO CONCLUÍDA"

### Passo 2: Configurar Autenticação Google

1. No Supabase, vá em **Authentication** → **Providers**
2. Ative **Google**
3. Configure OAuth no [Google Cloud Console](https://console.cloud.google.com):
   - Crie um projeto ou use existente
   - Vá em **APIs & Services** → **Credentials**
   - Crie **OAuth 2.0 Client ID** (Web application)
   - Adicione URLs autorizadas:
     - `https://[seu-projeto].supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (desenvolvimento)
4. Copie **Client ID** e **Client Secret** para o Supabase

### Passo 3: Configurar Variáveis de Ambiente

1. Copie `.env.example` para `.env.local`

```bash
cp .env.example .env.local