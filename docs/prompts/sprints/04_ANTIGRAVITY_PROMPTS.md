# MMA Event Management System - Antigravity Prompts

## O que são Antigravity Prompts?

São prompts de emergência para resolver problemas comuns que podem travar o desenvolvimento. Use quando encontrar um erro que não consegue resolver.

---

## 1. Erros de Supabase

### 1.1 Erro: "Invalid API key"

**Sintoma:**
```
AuthApiError: Invalid API key
```

**Prompt para resolver:**
```
Estou recebendo erro "Invalid API key" do Supabase.

Verifique:
1. Se .env.local existe na raiz do projeto
2. Se NEXT_PUBLIC_SUPABASE_URL está correto (sem barra no final)
3. Se NEXT_PUBLIC_SUPABASE_ANON_KEY está correto (começa com "eyJ")
4. Se o servidor foi reiniciado após alterar .env.local

Mostre o conteúdo esperado do .env.local (com placeholders) e como verificar as chaves no Supabase Dashboard.
```

---

### 1.2 Erro: "relation does not exist"

**Sintoma:**
```
PostgresError: relation "mma_people" does not exist
```

**Prompt para resolver:**
```
Estou recebendo erro "relation mma_people does not exist".

Isso significa que as tabelas não foram criadas no Supabase.

Verifique:
1. Se o 00_DATABASE_FOUNDATION.sql foi executado no Supabase SQL Editor
2. Se foi executado no projeto correto (verifique a URL do projeto)
3. Se todas as partes foram executadas na ordem correta

Gere um comando SQL para verificar se as tabelas existem:
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'mma_%';
```

---

### 1.3 Erro: "permission denied for table"

**Sintoma:**
```
PostgresError: permission denied for table mma_users
```

**Prompt para resolver:**
```
Estou recebendo erro "permission denied for table mma_users".

Isso indica problema com RLS (Row Level Security).

Verifique:
1. Se o usuário está autenticado (auth.uid() não é null)
2. Se as políticas RLS estão criadas para a tabela
3. Se o usuário atende às condições das políticas

Gere comandos para:
1. Verificar se RLS está habilitado
2. Listar políticas da tabela
3. Testar se o usuário tem acesso
```

---

### 1.4 Erro: "JWT expired"

**Sintoma:**
```
AuthApiError: JWT expired
```

**Prompt para resolver:**
```
Estou recebendo erro "JWT expired".

O token de autenticação expirou e não foi renovado automaticamente.

Verifique:
1. Se está usando @supabase/ssr corretamente
2. Se o middleware está atualizando os cookies
3. Se o cliente está configurado corretamente

Mostre a implementação correta do cliente Supabase com refresh automático.
```

---

## 2. Erros de Next.js

### 2.1 Erro: "Module not found"

**Sintoma:**
```
Module not found: Can't resolve '@/components/ui/button'
```

**Prompt para resolver:**
```
Estou recebendo erro "Module not found" para @/components/ui/button.

Verifique:
1. Se o componente foi instalado via shadcn/ui
2. Se o path está correto no tsconfig.json
3. Se o arquivo existe no caminho esperado

Comandos para resolver:
1. pnpm dlx shadcn@latest add button
2. Verificar tsconfig.json tem "@/*": ["./src/*"]
3. Verificar se src/components/ui/button.tsx existe
```

---

### 2.2 Erro: "Hydration mismatch"

**Sintoma:**
```
Error: Hydration failed because the initial UI does not match what was rendered on the server
```

**Prompt para resolver:**
```
Estou recebendo erro de "Hydration mismatch".

Isso acontece quando o HTML do servidor difere do cliente.

Causas comuns:
1. Usar Date/Math.random sem useEffect
2. Acessar window/localStorage no render
3. Extensões do browser modificando o DOM

Solução:
1. Mover código que depende do browser para useEffect
2. Usar 'use client' quando necessário
3. Usar suppressHydrationWarning em casos específicos

Mostre como corrigir o componente problemático.
```

---

### 2.3 Erro: "Server Component cannot use hooks"

**Sintoma:**
```
Error: useState only works in Client Components. Add the "use client" directive.
```

**Prompt para resolver:**
```
Estou recebendo erro sobre hooks em Server Components.

Em Next.js 14+ com App Router:
- Server Components: não podem usar hooks (useState, useEffect, etc.)
- Client Components: precisam de 'use client' no topo do arquivo

Solução:
1. Adicionar 'use client' no topo do arquivo
2. Ou mover a lógica com hooks para um componente filho client

Mostre como separar Server e Client Components corretamente.
```

---

### 2.4 Erro: "cookies() should be awaited"

**Sintoma:**
```
Error: cookies() should be awaited before using its value
```

**Prompt para resolver:**
```
Estou recebendo erro sobre cookies() precisar de await.

No Next.js 15+, cookies() é assíncrono.

Antes (Next.js 14):
const cookieStore = cookies()

Depois (Next.js 15+):
const cookieStore = await cookies()

Atualize o arquivo src/lib/supabase/server.ts para usar await.
```

---

## 3. Erros de Autenticação

### 3.1 Login não redireciona

**Sintoma:**
Login funciona mas não redireciona para dashboard.

**Prompt para resolver:**
```
O login funciona mas não redireciona para o dashboard.

Verifique:
1. Se router.push('/dashboard') está sendo chamado
2. Se router.refresh() está sendo chamado após o push
3. Se o middleware está configurado corretamente
4. Se há erros no console

Mostre o fluxo correto de login com redirecionamento:
1. Chamar supabase.auth.signInWithPassword
2. Verificar se não houve erro
3. Chamar router.push('/dashboard')
4. Chamar router.refresh()
```

---

### 3.2 Google OAuth não funciona

**Sintoma:**
Erro ao tentar login com Google.

**Prompt para resolver:**
```
O login com Google não está funcionando.

Checklist de configuração:
1. Google Cloud Console:
   - Criar projeto
   - Habilitar Google+ API
   - Criar credenciais OAuth 2.0
   - Adicionar Authorized redirect URI: https://<project>.supabase.co/auth/v1/callback

2. Supabase Dashboard:
   - Authentication > Providers > Google
   - Habilitar
   - Colar Client ID e Client Secret
   - Copiar Callback URL e adicionar no Google

3. Código:
   - Verificar se redirectTo está correto
   - Verificar se /callback/route.ts existe

Mostre cada passo com screenshots ou comandos.
```

---

### 3.3 Usuário criado mas sem perfil

**Sintoma:**
Usuário existe em auth.users mas não em mma_users.

**Prompt para resolver:**
```
Usuário foi criado no Supabase Auth mas não aparece em mma_users.

O trigger handle_new_user deveria criar automaticamente.

Verifique:
1. Se o trigger existe:
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

2. Se a função existe:
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';

3. Se há erros no log do Supabase

Se o trigger não existe, recrie executando a PARTE 6 do 00_DATABASE_FOUNDATION.sql.
```

---

## 4. Erros de RLS

### 4.1 Usuário não consegue ver dados

**Sintoma:**
Query retorna vazio mesmo com dados no banco.

**Prompt para resolver:**
```
A query retorna vazio mas sei que existem dados no banco.

Isso geralmente é RLS bloqueando.

Passos para debug:
1. Verificar se está autenticado:
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user)

2. Testar no Supabase Dashboard (SQL Editor) como o usuário:
SET request.jwt.claim.sub = 'USER_ID_AQUI';
SELECT * FROM mma_people;

3. Verificar políticas:
SELECT * FROM pg_policies WHERE tablename = 'mma_people';

4. Verificar se usuário está ativo:
SELECT * FROM mma_users WHERE id = 'USER_ID';

Mostre como debugar e corrigir.
```

---

### 4.2 Admin não tem acesso total

**Sintoma:**
Usuário admin não consegue ver/editar tudo.

**Prompt para resolver:**
```
Usuário com user_type = 'admin' não tem acesso total.

Verifique:
1. Se o user_type está realmente como 'admin' na tabela mma_users
2. Se a função is_admin_user() existe e funciona
3. Se as políticas usam is_admin_user() corretamente

Teste:
SELECT public.is_admin_user();

Se retornar false, verifique a função e o registro do usuário.
```

---

## 5. Erros de UI/Componentes

### 5.1 shadcn/ui componente não funciona

**Sintoma:**
Componente importado mas não renderiza ou dá erro.

**Prompt para resolver:**
```
Componente shadcn/ui não está funcionando corretamente.

Verifique:
1. Se foi instalado: pnpm dlx shadcn@latest add [componente]
2. Se o import está correto: import { Button } from '@/components/ui/button'
3. Se o arquivo existe em src/components/ui/

Se precisar reinstalar:
1. Delete src/components/ui/[componente].tsx
2. Execute: pnpm dlx shadcn@latest add [componente]

Liste os componentes necessários para este projeto.
```

---

### 5.2 Tailwind classes não aplicam

**Sintoma:**
Classes do Tailwind não têm efeito.

**Prompt para resolver:**
```
Classes do Tailwind não estão sendo aplicadas.

Verifique:
1. Se tailwind.config.ts tem o content correto:
content: [
  './src/**/*.{js,ts,jsx,tsx,mdx}',
]

2. Se globals.css importa o Tailwind:
@tailwind base;
@tailwind components;
@tailwind utilities;

3. Se globals.css é importado no layout.tsx

4. Se o servidor foi reiniciado após mudanças

Mostre a configuração correta do Tailwind.
```

---

### 5.3 Dark mode não funciona

**Sintoma:**
Toggle de tema não altera as cores.

**Prompt para resolver:**
```
O toggle dark/light mode não está funcionando.

Verifique:
1. Se next-themes está instalado: pnpm add next-themes
2. Se ThemeProvider está no layout.tsx
3. Se html tem suppressHydrationWarning
4. Se ThemeProvider tem attribute="class"

Configuração correta:
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>

5. Se o CSS usa variáveis corretas (dark:bg-*, etc.)
```

---

## 6. Erros de Build/Deploy

### 6.1 Build falha com erro de tipo

**Sintoma:**
```
Type error: Property 'X' does not exist on type 'Y'
```

**Prompt para resolver:**
```
O build está falhando com erro de TypeScript.

Passos:
1. Rode pnpm type-check para ver todos os erros
2. Corrija cada erro de tipo
3. Se for tipo do Supabase, regenere os tipos:
   npx supabase gen types typescript --project-id <id> > src/types/supabase.ts

Erros comuns:
- Propriedade pode ser undefined: use optional chaining (?.)
- Tipo incompatível: verifique o tipo esperado
- Import errado: verifique o caminho

Mostre como corrigir o erro específico.
```

---

### 6.2 Deploy Vercel falha

**Sintoma:**
Deploy no Vercel falha durante build.

**Prompt para resolver:**
```
O deploy no Vercel está falhando.

Verifique:
1. Se todas as variáveis de ambiente estão configuradas no Vercel
2. Se o build funciona localmente: pnpm build
3. Se não há dependências faltando
4. Se não há imports de arquivos inexistentes

Logs do Vercel mostram o erro específico.

Variáveis obrigatórias no Vercel:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Mostre como configurar e debugar.
```

---

### 6.3 Erro em produção mas não em dev

**Sintoma:**
Funciona em localhost mas não em produção.

**Prompt para resolver:**
```
O sistema funciona em localhost mas dá erro em produção.

Causas comuns:
1. Variáveis de ambiente diferentes/faltando
2. URLs hardcoded para localhost
3. CORS não configurado
4. RLS mais restritivo em produção

Debug:
1. Verifique console do browser em produção
2. Verifique logs do Vercel
3. Compare variáveis de ambiente
4. Teste as mesmas ações em dev e prod

Mostre como identificar e corrigir a diferença.
```

---

## 7. Erros de Real-time

### 7.1 Real-time não atualiza

**Sintoma:**
Mudanças no banco não aparecem automaticamente.

**Prompt para resolver:**
```
O real-time do Supabase não está funcionando.

Verifique:
1. Se RLS permite SELECT para o usuário
2. Se a subscription está correta:
supabase
  .channel('nome')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'mma_enrollments'
  }, callback)
  .subscribe()

3. Se o cleanup está correto no useEffect:
return () => supabase.removeChannel(channel)

4. Se Realtime está habilitado no Supabase Dashboard

Mostre implementação correta com debug.
```

---

### 7.2 Muitas conexões WebSocket

**Sintoma:**
Erro de limite de conexões ou lentidão.

**Prompt para resolver:**
```
Estou tendo problemas com muitas conexões WebSocket.

Causas:
1. useEffect sem cleanup
2. Múltiplas subscriptions para a mesma tabela
3. Re-renders criando novas conexões

Solução:
1. Sempre fazer cleanup: return () => supabase.removeChannel(channel)
2. Usar um único channel por contexto
3. Mover subscription para um provider global

Mostre padrão correto de subscription com cleanup.
```

---

## 8. Prompt Universal de Debug

Quando nenhum dos anteriores resolver, use:

```
Estou com um erro que não consigo resolver.

ERRO:
[Cole a mensagem de erro completa]

CONTEXTO:
- Arquivo: [caminho do arquivo]
- Função/Componente: [nome]
- O que eu estava tentando fazer: [descrição]

CÓDIGO RELEVANTE:
[Cole o código problemático]

O QUE JÁ TENTEI:
1. [Tentativa 1]
2. [Tentativa 2]

Por favor:
1. Identifique a causa raiz do erro
2. Explique por que está acontecendo
3. Mostre a correção passo a passo
4. Mostre o código corrigido completo
```

---

## 9. Reset Completo

Se tudo mais falhar, reset completo:

```
Preciso fazer um reset completo do projeto.

Passos:
1. Fazer backup dos arquivos .env.local
2. Deletar node_modules e .next
3. Deletar package-lock.json ou pnpm-lock.yaml
4. Reinstalar dependências: pnpm install
5. Reiniciar servidor: pnpm dev

Se o banco estiver com problemas:
1. Supabase Dashboard > SQL Editor
2. Executar: DROP SCHEMA public CASCADE; CREATE SCHEMA public;
3. Re-executar 00_DATABASE_FOUNDATION.sql

ATENÇÃO: Isso apaga todos os dados do banco!
```
