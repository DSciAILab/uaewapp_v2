# MMA Event Management System - Security Checklist

## 1. Autenticação

### 1.1 Supabase Auth

- [ ] Email/Senha configurado para admin/staff
- [ ] Google OAuth configurado para colaboradores temporários
- [ ] Callback URL configurado corretamente
- [ ] Redirect URLs limitados a domínios autorizados

### 1.2 Sessões

- [ ] Cookies seguros (httpOnly, secure, sameSite)
- [ ] Expiração de sessão configurada
- [ ] Refresh token funcionando
- [ ] Logout limpa todos os cookies

### 1.3 Senhas

- [ ] Mínimo 8 caracteres
- [ ] Hash seguro (Supabase usa bcrypt)
- [ ] Não armazenar senhas em plain text
- [ ] Reset de senha via email

---

## 2. Autorização

### 2.1 Row Level Security (RLS)

```sql
-- Verificar RLS habilitado em todas as tabelas
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'mma_%';
```

- [ ] RLS habilitado em mma_users
- [ ] RLS habilitado em mma_user_invites
- [ ] RLS habilitado em mma_permission_areas
- [ ] RLS habilitado em mma_user_permissions
- [ ] RLS habilitado em mma_roles
- [ ] RLS habilitado em mma_people
- [ ] RLS habilitado em mma_people_documents
- [ ] RLS habilitado em mma_events
- [ ] RLS habilitado em mma_event_checklist_items
- [ ] RLS habilitado em mma_enrollments
- [ ] RLS habilitado em mma_enrollment_corners
- [ ] RLS habilitado em mma_flights
- [ ] RLS habilitado em mma_visas
- [ ] RLS habilitado em mma_hotels
- [ ] RLS habilitado em mma_transport_drivers
- [ ] RLS habilitado em mma_transport_cars
- [ ] RLS habilitado em mma_transport_passengers
- [ ] RLS habilitado em mma_athlete_stats
- [ ] RLS habilitado em mma_athlete_music
- [ ] RLS habilitado em mma_athlete_tasks
- [ ] RLS habilitado em mma_pre_event_checks
- [ ] RLS habilitado em mma_batches
- [ ] RLS habilitado em mma_batch_passengers
- [ ] RLS habilitado em mma_messages
- [ ] RLS habilitado em mma_message_attachments
- [ ] RLS habilitado em mma_message_reads

### 2.2 Políticas RLS

- [ ] Usuários só veem seus próprios dados (mma_users)
- [ ] Admin tem acesso total
- [ ] Usuários inativos não têm acesso
- [ ] Usuários expirados não têm acesso
- [ ] Permissões por área funcionando

### 2.3 Middleware

```typescript
// src/middleware.ts
- [ ] Verifica autenticação em rotas protegidas
- [ ] Redireciona para /login se não autenticado
- [ ] Redireciona para /dashboard se já autenticado
- [ ] Rotas públicas definidas corretamente
```

---

## 3. Dados Sensíveis

### 3.1 Identificação de Dados Sensíveis

| Dado | Tabela | Campo | Classificação |
|------|--------|-------|---------------|
| Nome completo | mma_people | compiled_name | PII |
| Data nascimento | mma_people | dob | PII |
| Telefone | mma_people | phone | PII |
| Nacionalidade | mma_people | nationality | PII |
| Nº Passaporte | mma_people | passport_number | PII Crítico |
| Validade passaporte | mma_people | passport_expiry | PII |
| Foto passaporte | mma_people | passport_photo | PII Crítico |
| Pasta documentos | mma_people | document_folder | PII |
| Email usuário | mma_users | email | PII |
| Detalhes de voo | mma_flights | * | Sensível |
| Reservas hotel | mma_hotels | * | Sensível |
| Status visto | mma_visas | * | Sensível |

### 3.2 Proteções

- [ ] Dados de passaporte com acesso restrito
- [ ] Links do Google Drive com permissões restritas
- [ ] Logs de acesso a dados sensíveis (auditoria)
- [ ] Não expor dados sensíveis em URLs
- [ ] Não logar dados sensíveis no console

---

## 4. Variáveis de Ambiente

### 4.1 Checklist

```bash
# .env.local (NUNCA commitar)
- [ ] NEXT_PUBLIC_SUPABASE_URL definido
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY definido
- [ ] SUPABASE_SERVICE_ROLE_KEY definido (apenas server-side)
- [ ] GOOGLE_CLIENT_ID definido
- [ ] GOOGLE_CLIENT_SECRET definido (apenas server-side)
```

### 4.2 Regras

- [ ] .env.local no .gitignore
- [ ] .env.example com placeholders (sem valores reais)
- [ ] Variáveis NEXT_PUBLIC_* são públicas (cuidado!)
- [ ] SERVICE_ROLE_KEY nunca no frontend
- [ ] Variáveis configuradas no Vercel

### 4.3 Validação no Código

```typescript
// src/lib/supabase/client.ts
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
}
```

- [ ] Validação de variáveis obrigatórias implementada
- [ ] Erro claro se variável faltando
- [ ] Não expor detalhes do erro em produção

---

## 5. Validação de Dados

### 5.1 Frontend (Zod)

- [ ] Schemas Zod para todos os formulários
- [ ] Validação antes de enviar ao servidor
- [ ] Mensagens de erro claras
- [ ] Sanitização de inputs

### 5.2 Backend (RLS + Constraints)

- [ ] Constraints de banco (NOT NULL, UNIQUE, CHECK)
- [ ] RLS valida permissões
- [ ] Tipos corretos (UUID, DATE, etc.)

### 5.3 Exemplos de Validação

```typescript
// Pessoa
const personSchema = z.object({
  name: z.string().min(1).max(100),
  surname: z.string().min(1).max(100),
  email: z.string().email().optional(),
  passport_number: z.string().max(50).optional(),
  // ...
})

// Evento
const eventSchema = z.object({
  name: z.string().min(1).max(200),
  event_date: z.string().min(1), // ISO date
  // ...
})
```

---

## 6. Controle de Acesso Temporário

### 6.1 Fluxo de Convite

```
┌─────────────────────────────────────────────────────────────┐
│                    CRIAÇÃO DO CONVITE                       │
├─────────────────────────────────────────────────────────────┤
│ - [ ] Admin autenticado                                     │
│ - [ ] Email do colaborador validado                         │
│ - [ ] Data de expiração definida                            │
│ - [ ] Permissões por área definidas                         │
│ - [ ] Token único gerado                                    │
│ - [ ] Registro em mma_user_invites                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    ACEITE DO CONVITE                        │
├─────────────────────────────────────────────────────────────┤
│ - [ ] Token válido                                          │
│ - [ ] Token não expirado                                    │
│ - [ ] Email do Google == Email do convite                   │
│ - [ ] Criar/atualizar mma_users                             │
│ - [ ] Copiar permissões do convite                          │
│ - [ ] Marcar convite como aceito                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    CONTROLE DE ACESSO                       │
├─────────────────────────────────────────────────────────────┤
│ - [ ] Verificar is_active a cada request                    │
│ - [ ] Verificar expires_at a cada request                   │
│ - [ ] Bloquear se expirado                                  │
│ - [ ] Admin pode revogar manualmente                        │
│ - [ ] Log de último acesso                                  │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Checklist

- [ ] Convites têm data de expiração obrigatória
- [ ] Sistema verifica expiração a cada request
- [ ] Admin pode revogar acesso a qualquer momento
- [ ] Usuário expirado não consegue acessar
- [ ] Lista de usuários ativos visível para admin
- [ ] Alerta de expiração próxima

---

## 7. Auditoria

### 7.1 O que é Auditado

| Tabela | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|
| mma_people | ✅ | ✅ | ✅ |
| mma_enrollments | ✅ | ✅ | ✅ |
| mma_flights | ✅ | ✅ | ✅ |
| mma_visas | ✅ | ✅ | ✅ |
| mma_hotels | ✅ | ✅ | ✅ |

### 7.2 Dados Registrados

- [ ] Tabela afetada
- [ ] ID do registro
- [ ] Ação (INSERT/UPDATE/DELETE)
- [ ] Dados anteriores (old_data)
- [ ] Dados novos (new_data)
- [ ] Campos alterados
- [ ] Usuário que fez a alteração
- [ ] Timestamp

### 7.3 Acesso à Auditoria

- [ ] Tabela em schema privado (app_private)
- [ ] Apenas admin pode consultar
- [ ] Não expor via API pública
- [ ] Retenção definida (ex: 1 ano)

---

## 8. Comunicação

### 8.1 HTTPS

- [ ] Vercel força HTTPS automaticamente
- [ ] Redirect HTTP → HTTPS
- [ ] HSTS habilitado

### 8.2 Headers de Segurança

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]
```

- [ ] Headers configurados no next.config.js
- [ ] X-Frame-Options para prevenir clickjacking
- [ ] X-Content-Type-Options para prevenir MIME sniffing
- [ ] HSTS para forçar HTTPS

---

## 9. Google Drive

### 9.1 Permissões de Documentos

| Tipo de Documento | Permissão Recomendada |
|-------------------|----------------------|
| Passaportes | Restrito (apenas equipe) |
| Vistos | Restrito (apenas equipe) |
| Documentos pessoais | Restrito (apenas equipe) |
| Fotos de perfil | Pode ser público |
| Tickets aéreos | Restrito (apenas equipe) |

### 9.2 Checklist

- [ ] Pasta raiz com acesso restrito
- [ ] Subpastas herdam permissões
- [ ] Compartilhar apenas com emails autorizados
- [ ] Revisar links públicos periodicamente
- [ ] Passaportes NUNCA públicos

---

## 10. Prevenção de Ataques

### 10.1 SQL Injection

- [ ] Usar cliente Supabase (queries parametrizadas)
- [ ] Nunca concatenar strings em queries
- [ ] RLS como camada adicional

### 10.2 XSS (Cross-Site Scripting)

- [ ] React escapa por padrão
- [ ] Não usar dangerouslySetInnerHTML
- [ ] Sanitizar inputs do usuário
- [ ] Content-Security-Policy configurado

### 10.3 CSRF (Cross-Site Request Forgery)

- [ ] Cookies SameSite=Lax ou Strict
- [ ] Supabase Auth gerencia tokens
- [ ] Verificar origin em mutations

### 10.4 Rate Limiting

- [ ] Supabase tem rate limiting nativo
- [ ] API Routes com rate limiting (se necessário)
- [ ] Limitar tentativas de login

---

## 11. Monitoramento

### 11.1 Logs

- [ ] Erros de autenticação logados
- [ ] Acessos negados logados
- [ ] Alterações em dados sensíveis auditadas
- [ ] Não logar dados sensíveis (senhas, tokens)

### 11.2 Alertas

- [ ] Múltiplas tentativas de login falhas
- [ ] Acesso de IP suspeito
- [ ] Alterações em massa
- [ ] Usuários com expiração próxima

---

## 12. Backup e Recuperação

### 12.1 Supabase

- [ ] Backup automático habilitado
- [ ] Point-in-time recovery disponível
- [ ] Testar restauração periodicamente

### 12.2 Google Drive

- [ ] Documentos em pasta organizada
- [ ] Versionamento de arquivos
- [ ] Lixeira mantém arquivos deletados

---

## 13. Checklist de Deploy

### 13.1 Antes do Deploy

- [ ] Todas as variáveis de ambiente configuradas no Vercel
- [ ] SERVICE_ROLE_KEY não exposto no frontend
- [ ] RLS habilitado e testado
- [ ] Convites de teste removidos
- [ ] Usuários de teste removidos
- [ ] Console.log de debug removidos
- [ ] Dados sensíveis não expostos

### 13.2 Após o Deploy

- [ ] Testar login email/senha
- [ ] Testar login Google
- [ ] Testar permissões por área
- [ ] Testar expiração de usuário
- [ ] Verificar headers de segurança
- [ ] Verificar HTTPS forçado

---

## 14. Revisão Periódica

### 14.1 Mensal

- [ ] Revisar usuários ativos e expirados
- [ ] Verificar logs de auditoria
- [ ] Atualizar dependências (npm audit)

### 14.2 Trimestral

- [ ] Revisar permissões de Google Drive
- [ ] Revisar políticas RLS
- [ ] Testar recuperação de backup
- [ ] Revisar usuários com acesso admin

### 14.3 Anual

- [ ] Rotacionar credenciais Google OAuth
- [ ] Revisar toda a documentação de segurança
- [ ] Avaliar novas ameaças e mitigações
