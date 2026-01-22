# MMA Event Management System

Sistema de gestão de logística e operações para eventos de MMA.

## 📋 Visão Geral

Sistema centralizado para gerenciar:
- **People Database**: Base de dados de atletas, corners, staff e guests
- **Logística**: Aéreo, vistos, hotel e transporte
- **Operações**: Stats, música, blood test, photoshoot, pre-event check, batches
- **Dashboard**: Urgências em tempo real, modo TV para Sala de Guerra

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14+, React 18+, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Auth**: Email/Senha (admin) + Google OAuth (colaboradores)
- **Deploy**: Vercel + Supabase Cloud

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- pnpm (recomendado) ou npm
- Conta no Supabase
- Conta no Google Cloud (para OAuth e Drive API)

### 1. Banco de Dados (OBRIGATÓRIO PRIMEIRO)

O banco de dados já deve estar configurado no Supabase com o script `00_DATABASE_FOUNDATION.sql`.

**Verificar se está OK:**
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em Table Editor
3. Confirme que existem 27 tabelas com prefixo `mma_`

### 2. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/mma-event-system.git
cd mma-event-system
```

### 3. Instalar Dependências

```bash
pnpm install
```

### 4. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e preencha:

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# Google OAuth
GOOGLE_CLIENT_ID=seu-google-client-id
GOOGLE_CLIENT_SECRET=seu-google-client-secret

# Google Drive API (opcional, para upload)
GOOGLE_DRIVE_API_KEY=sua-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Onde encontrar as chaves do Supabase:**
1. Supabase Dashboard → Settings → API
2. `Project URL` = NEXT_PUBLIC_SUPABASE_URL
3. `anon public` = NEXT_PUBLIC_SUPABASE_ANON_KEY
4. `service_role` = SUPABASE_SERVICE_ROLE_KEY (⚠️ nunca exponha no frontend)

### 5. Configurar Google OAuth no Supabase

1. Supabase Dashboard → Authentication → Providers
2. Habilite Google
3. Cole o Client ID e Client Secret do Google Cloud Console
4. Copie o Callback URL e adicione no Google Cloud Console

### 6. Rodar o Projeto

```bash
pnpm dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

### 7. Criar Primeiro Usuário Admin

1. Acesse o Supabase Dashboard → Authentication → Users
2. Clique em "Add user" → "Create new user"
3. Preencha email e senha
4. Após criar, vá em Table Editor → mma_users
5. Encontre o registro e altere `user_type` para `admin`

## 📁 Estrutura do Projeto

```
mma-event-system/
├── docs/
│   ├── database/
│   │   └── 00_DATABASE_FOUNDATION.sql
│   ├── prompts/
│   │   ├── SPRINT_00_PROMPT.md
│   │   ├── SPRINT_01_PROMPT.md
│   │   └── ...
│   └── sprints/
│       ├── SPRINT_00_REPORT.md
│       └── ...
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── callback/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── people/
│   │   │   ├── events/
│   │   │   ├── flights/
│   │   │   ├── visas/
│   │   │   ├── hotels/
│   │   │   ├── transport/
│   │   │   └── settings/
│   │   ├── tv/
│   │   │   └── [mode]/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── forms/
│   │   ├── tables/
│   │   └── dashboard/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── utils/
│   │   └── constants.ts
│   ├── hooks/
│   │   ├── use-realtime.ts
│   │   └── use-permissions.ts
│   └── types/
│       └── database.ts
├── public/
├── .env.example
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── package.json
└── README.md
```

## 🔐 Autenticação

### Tipos de Usuário

| Tipo | Login | Expiração | Uso |
|------|-------|-----------|-----|
| `admin` | Email/Senha | Nunca | Administradores |
| `staff` | Email/Senha | Configurável | Equipe fixa |
| `temporary` | Google OAuth | Por evento | Colaboradores |

### Fluxo de Convite (Temporários)

1. Admin cria convite com email e prazo
2. Colaborador recebe link
3. Faz login com Google (mesmo email)
4. Sistema valida e libera acesso
5. Após prazo, acesso expira automaticamente

## 🎨 Temas

O sistema suporta modo claro e escuro:

- **Cor de acento**: #E63946 (vermelho)
- **Toggle**: disponível no header
- **Preferência**: salva no localStorage

## 📊 Modo TV (Sala de Guerra)

Acesse `/tv/logistics` ou `/tv/operations` para dashboards em tela cheia.

**Configurações:**
- Rotação automática entre dashboards
- Tempo de rotação configurável
- Auto-refresh via WebSocket (10s)

## 🔄 Real-time

O sistema usa Supabase Realtime para sincronização:

- Alterações refletem em todos os dispositivos
- Dashboard atualiza automaticamente
- Indicadores visuais de mudanças

## 📦 Scripts Disponíveis

```bash
pnpm dev          # Desenvolvimento
pnpm build        # Build de produção
pnpm start        # Rodar build
pnpm lint         # Verificar código
pnpm type-check   # Verificar tipos
```

## 🚢 Deploy

### Vercel (Recomendado)

1. Conecte o repositório GitHub na Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Variáveis no Vercel

Adicione todas as variáveis do `.env.local` nas configurações do projeto na Vercel.

## 🐛 Troubleshooting

### Erro: "Invalid API key"
- Verifique se as variáveis de ambiente estão corretas
- Confirme que não há espaços extras nas chaves

### Erro: "User not found"
- Execute o script de banco de dados primeiro
- Verifique se o trigger `handle_new_user` existe

### Erro: "Permission denied"
- Verifique se o usuário está ativo
- Confirme as permissões na tabela `mma_user_permissions`

### Real-time não funciona
- Verifique se RLS está habilitado
- Confirme que o usuário tem permissão de SELECT

## 📄 Licença

Projeto privado para uso interno.

## 📞 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.
