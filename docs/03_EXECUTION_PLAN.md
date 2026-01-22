# MMA Event Management System - Plano de Execução

## 1. Visão Geral

### 1.1 Fases do Projeto

```
┌─────────────────────────────────────────────────────────────┐
│                    MVP FASE 1                               │
│               Fundação + Logística                          │
│         SPRINT 00 → SPRINT 01 → ... → SPRINT 05             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MVP FASE 2                               │
│                    Operações                                │
│              SPRINT 06 → SPRINT 07                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    FINALIZAÇÃO                              │
│              Dashboard + Deploy                             │
│                    SPRINT 08                                │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Estimativa de Tempo

| Fase | Sprints | Estimativa |
|------|---------|------------|
| MVP Fase 1 | 00-05 | 3-4 semanas |
| MVP Fase 2 | 06-07 | 1-2 semanas |
| Finalização | 08 | 1 semana |
| **Total** | **9 sprints** | **5-7 semanas** |

---

## 2. Mapa de Sprints

### 2.1 Diagrama de Dependências

```
SPRINT_00 (Setup)
     │
     ▼
SPRINT_01 (Auth + People)
     │
     ├──────────────────┬──────────────────┐
     ▼                  ▼                  ▼
SPRINT_02           SPRINT_03          SPRINT_04
(Events +           (Flights)          (Visas)
 Enrolled)              │                  │
     │                  │                  │
     └──────────────────┼──────────────────┘
                        │
                        ▼
                   SPRINT_05
                (Hotels + Transport)
                        │
                        ▼
              ┌─────────┴─────────┐
              ▼                   ▼
         SPRINT_06           SPRINT_07
      (Stats + Music +      (Pre-event +
       Tasks)                Batches)
              │                   │
              └─────────┬─────────┘
                        │
                        ▼
                   SPRINT_08
            (Dashboard + War Room +
                   Deploy)
```

### 2.2 Resumo por Sprint

| Sprint | Nome | Objetivo | Dependências |
|--------|------|----------|--------------|
| 00 | Setup | Criar projeto, configurar Supabase, estrutura base | - |
| 01 | Auth + People | Autenticação, permissões, CRUD de pessoas | 00 |
| 02 | Events + Enrolled | CRUD de eventos, enrollment com Event ID | 01 |
| 03 | Flights | CRUD de voos, tickets, vinculação com enrollment | 02 |
| 04 | Visas | CRUD de vistos, workflow de status | 02 |
| 05 | Hotels + Transport | Reservas, divergências, carros, drivers | 03, 04 |
| 06 | Stats + Music + Tasks | Dados de atletas, músicas, blood test/photo/video | 02 |
| 07 | Pre-event + Batches | Checklist configurável, agrupamentos, boarding | 06 |
| 08 | Dashboard + Deploy | Dashboard urgências, War Room TV, deploy Vercel | Todos |

---

## 3. Detalhamento por Sprint

### 3.1 SPRINT 00 - Setup

**Objetivo:** Configurar o projeto base com Next.js, Supabase e estrutura de pastas.

**Tarefas:**
1. Criar projeto Next.js 14+
2. Instalar dependências (Supabase, shadcn/ui, etc.)
3. Configurar Tailwind CSS
4. Inicializar shadcn/ui
5. Criar estrutura de pastas
6. Configurar Supabase client (browser + server)
7. Criar middleware de autenticação
8. Criar types do database
9. Criar constantes e utils
10. Criar layout base com sidebar
11. Criar página de login
12. Criar página de dashboard (placeholder)

**Entregáveis:**
- Projeto rodando em localhost
- Login funcional (email/senha)
- Layout com sidebar
- Estrutura de pastas completa

**Critérios de Aceitação:**
- [ ] `pnpm dev` roda sem erros
- [ ] Página de login aparece
- [ ] Após login, redireciona para dashboard
- [ ] Sidebar com menu visível
- [ ] Toggle dark/light mode funciona

---

### 3.2 SPRINT 01 - Auth + People

**Objetivo:** Completar autenticação (Google OAuth, convites) e CRUD de pessoas.

**Tarefas:**
1. Configurar Google OAuth no Supabase
2. Implementar login com Google
3. Criar sistema de convites
4. Implementar expiração de usuários
5. Criar hooks de permissões
6. Criar serviço de People
7. Criar formulário de pessoa
8. Criar tabela de pessoas
9. Implementar importação CSV
10. Implementar busca e filtros

**Entregáveis:**
- Login Google funcionando
- Sistema de convites
- CRUD completo de pessoas
- Importação de CSV

**Critérios de Aceitação:**
- [ ] Login com Google funciona
- [ ] Admin pode criar convites
- [ ] Colaborador acessa via convite
- [ ] Acesso expira após prazo
- [ ] CRUD de pessoas funciona
- [ ] Importação CSV funciona
- [ ] Normalização de nomes funciona

---

### 3.3 SPRINT 02 - Events + Enrolled

**Objetivo:** CRUD de eventos e enrollment de pessoas com Event ID automático.

**Tarefas:**
1. Criar serviço de Events
2. Criar serviço de Enrollments
3. Criar formulário de evento
4. Criar formulário de enrollment
5. Criar página de listagem de eventos
6. Criar página de detalhes do evento
7. Implementar Event ID automático (F.001, C.002)
8. Implementar vinculação corner-fighter
9. Implementar necessidades logísticas
10. Criar tabs por role (Fighters, Corners, Staff, Guests)

**Entregáveis:**
- CRUD de eventos
- Enrollment com Event ID
- Necessidades logísticas por pessoa
- Tabs de visualização por role

**Critérios de Aceitação:**
- [ ] Criar/editar/excluir eventos funciona
- [ ] Adicionar pessoas ao evento funciona
- [ ] Event ID gerado automaticamente
- [ ] Necessidades logísticas editáveis
- [ ] Cancelamento de enrollment funciona

---

### 3.4 SPRINT 03 - Flights

**Objetivo:** CRUD de voos vinculados ao enrollment.

**Tarefas:**
1. Criar serviço de Flights
2. Criar formulário de voo
3. Criar tabela de voos
4. Implementar tipos (arrival/departure/full)
5. Implementar upload de ticket (link Drive)
6. Criar página de listagem de voos
7. Filtros por evento, status, data
8. Indicadores visuais de pendências

**Entregáveis:**
- CRUD de voos
- Vinculação com enrollment
- Upload de tickets
- Dashboard de pendências aéreas

**Critérios de Aceitação:**
- [ ] Criar voo para enrollment funciona
- [ ] Tipos arrival/departure/full funcionam
- [ ] Link de ticket salva corretamente
- [ ] Filtros funcionam
- [ ] Status visível (pendente/confirmado)

---

### 3.5 SPRINT 04 - Visas

**Objetivo:** CRUD de vistos com workflow de status.

**Tarefas:**
1. Criar serviço de Visas
2. Criar formulário de visto
3. Criar tabela de vistos
4. Implementar workflow de status (1-6)
5. Implementar link de documentos
6. Criar página de listagem de vistos
7. Filtros por status, nacionalidade
8. Indicadores visuais por status

**Entregáveis:**
- CRUD de vistos
- Workflow de status
- Dashboard de vistos pendentes

**Critérios de Aceitação:**
- [ ] Criar visto para enrollment funciona
- [ ] Status workflow funciona (1→2→3→4)
- [ ] Badge de cores por status
- [ ] Filtros funcionam
- [ ] is_done marca conclusão

---

### 3.6 SPRINT 05 - Hotels + Transport

**Objetivo:** Reservas de hotel com divergências e sistema de transporte.

**Tarefas:**
1. Criar serviço de Hotels
2. Criar formulário de hotel
3. Implementar cálculo automático (voo + margem)
4. Implementar detecção de divergências
5. Implementar aprovação de divergências
6. Criar serviço de Transport
7. Criar cadastro de drivers
8. Criar cadastro de carros
9. Implementar agrupamento por voo
10. Implementar sugestão automática de agrupamento

**Entregáveis:**
- CRUD de hotéis com divergências
- CRUD de drivers e carros
- Agrupamento inteligente de transporte

**Critérios de Aceitação:**
- [ ] Reserva de hotel funciona
- [ ] Cálculo automático de check-in/out
- [ ] Divergências detectadas automaticamente
- [ ] Aprovação de divergências funciona
- [ ] Cadastro de drivers funciona
- [ ] Agrupamento por voo funciona
- [ ] Numeração de carros automática

---

### 3.7 SPRINT 06 - Stats + Music + Tasks

**Objetivo:** Dados de atletas, músicas e tarefas operacionais.

**Tarefas:**
1. Criar serviço de AthleteStats
2. Criar formulário de stats
3. Implementar dados permanentes vs variáveis
4. Criar serviço de Music
5. Criar formulário de músicas (3 links)
6. Criar serviço de Tasks
7. Implementar blood test / photoshoot / video shoot
8. Implementar status (not_required/required/done)
9. Criar página de operações

**Entregáveis:**
- CRUD de stats por evento
- 3 músicas por atleta
- Tarefas com status

**Critérios de Aceitação:**
- [ ] Stats editáveis por evento
- [ ] Dados permanentes vêm do cadastro
- [ ] 3 links de música salvam
- [ ] Tarefas com status funcionam
- [ ] Filtro por status funciona

---

### 3.8 SPRINT 07 - Pre-event + Batches

**Objetivo:** Checklist configurável e sistema de batches para transfer.

**Tarefas:**
1. Criar serviço de PreEventCheck
2. Implementar itens fixos (Passport, Uniform, etc.)
3. Implementar itens extras por evento
4. Criar checklist por atleta
5. Criar serviço de Batches
6. Criar formulário de batch
7. Implementar adição de passageiros
8. Implementar status de boarding
9. Criar visualização de batches

**Entregáveis:**
- Checklist configurável
- Sistema de batches
- Boarding control

**Critérios de Aceitação:**
- [ ] Itens fixos aparecem automaticamente
- [ ] Itens extras configuráveis por evento
- [ ] Checklist por atleta funciona
- [ ] Criar batch funciona
- [ ] Adicionar passageiros funciona
- [ ] Status boarding funciona

---

### 3.9 SPRINT 08 - Dashboard + War Room + Deploy

**Objetivo:** Dashboard de urgências, modo TV e deploy final.

**Tarefas:**
1. Criar dashboard de urgências
2. Implementar KPIs (crítico/atenção/ok)
3. Implementar lista de urgências
4. Implementar progresso por área
5. Criar modo TV - Dashboard Logística
6. Criar modo TV - Dashboard Operações
7. Implementar rotação automática
8. Implementar auto-refresh via WebSocket
9. Configurar deploy no Vercel
10. Testar em produção

**Entregáveis:**
- Dashboard completo
- Modo TV funcionando
- Sistema em produção

**Critérios de Aceitação:**
- [ ] Dashboard mostra urgências
- [ ] KPIs calculados corretamente
- [ ] Modo TV logística funciona
- [ ] Modo TV operações funciona
- [ ] Rotação automática funciona
- [ ] Real-time atualiza automaticamente
- [ ] Deploy no Vercel funciona
- [ ] Sistema acessível via URL pública

---

## 4. Ordem de Execução

### 4.1 Sequência Recomendada

```
1. SPRINT_00 - Setup
2. SPRINT_01 - Auth + People
3. SPRINT_02 - Events + Enrolled
4. SPRINT_03 - Flights
5. SPRINT_04 - Visas
6. SPRINT_05 - Hotels + Transport
7. SPRINT_06 - Stats + Music + Tasks
8. SPRINT_07 - Pre-event + Batches
9. SPRINT_08 - Dashboard + War Room + Deploy
```

### 4.2 Execução Paralela (Opcional)

Se houver múltiplos desenvolvedores:

```
Desenvolvedor 1:          Desenvolvedor 2:
─────────────────         ─────────────────
SPRINT_00                 (aguarda)
SPRINT_01                 (aguarda)
SPRINT_02                 (aguarda)
SPRINT_03 ───────────────▶ SPRINT_04
SPRINT_05                 SPRINT_06
          ◀───────────────
SPRINT_07                 (aguarda)
SPRINT_08                 (review)
```

---

## 5. Gestão de Riscos

### 5.1 Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Integração Google OAuth falha | Média | Alto | Testar cedo, documentação Supabase |
| Real-time não funciona | Baixa | Alto | Testar em SPRINT_00, fallback polling |
| Performance com muitos dados | Média | Médio | Paginação, índices, lazy loading |
| Google Drive indisponível | Baixa | Médio | Links manuais como fallback |
| Limite free tier Supabase | Baixa | Alto | Monitorar uso, upgrade se necessário |

### 5.2 Plano de Contingência

**Se o Google OAuth falhar:**
- Usar apenas email/senha para todos
- Gerar senhas temporárias para colaboradores

**Se o real-time não funcionar:**
- Implementar polling a cada 30 segundos
- Botão de refresh manual

**Se exceder free tier:**
- Vercel: $20/mês Pro
- Supabase: $25/mês Pro

---

## 6. Critérios de Qualidade

### 6.1 Por Sprint

Antes de considerar um sprint concluído:

```markdown
## Código
- [ ] Sem erros de TypeScript
- [ ] Sem warnings de lint
- [ ] Código formatado
- [ ] Nomes descritivos

## Funcionalidade
- [ ] Fluxo principal funciona
- [ ] Casos de erro tratados
- [ ] Loading states implementados
- [ ] Feedback visual (toasts)

## Segurança
- [ ] RLS funcionando
- [ ] Validação no frontend
- [ ] Dados sensíveis protegidos

## UX
- [ ] Responsivo
- [ ] Acessível
- [ ] Performance aceitável
```

### 6.2 Antes do Deploy Final

```markdown
## Funcional
- [ ] Todos os CRUDs funcionam
- [ ] Permissões funcionam
- [ ] Real-time funciona
- [ ] Modo TV funciona

## Segurança
- [ ] Checklist de segurança completo
- [ ] Variáveis de ambiente configuradas
- [ ] RLS testado

## Performance
- [ ] Lighthouse score > 80
- [ ] Tempo de carregamento < 3s
- [ ] Real-time < 1s de delay

## Documentação
- [ ] README atualizado
- [ ] Documentação técnica completa
- [ ] Relatórios de sprint gerados
```

---

## 7. Comunicação

### 7.1 Relatórios de Sprint

Ao final de cada sprint, criar:

```
docs/sprints/SPRINT_XX_REPORT.md
```

Conteúdo:
- Objetivos alcançados
- Tarefas concluídas
- Problemas encontrados
- Decisões tomadas
- Próximos passos

### 7.2 Status do Projeto

Manter atualizado:

```
docs/EXECUTION_STATUS.md
```

Com:
- Sprint atual
- Progresso geral
- Bloqueios
- Próximas ações

---

## 8. Checklist de Conclusão

### 8.1 MVP Fase 1

- [ ] SPRINT_00 concluído
- [ ] SPRINT_01 concluído
- [ ] SPRINT_02 concluído
- [ ] SPRINT_03 concluído
- [ ] SPRINT_04 concluído
- [ ] SPRINT_05 concluído
- [ ] Testes de integração passando
- [ ] Documentação atualizada

### 8.2 MVP Fase 2

- [ ] SPRINT_06 concluído
- [ ] SPRINT_07 concluído
- [ ] Testes de integração passando
- [ ] Documentação atualizada

### 8.3 Finalização

- [ ] SPRINT_08 concluído
- [ ] Deploy em produção
- [ ] Testes em produção
- [ ] Documentação final
- [ ] Handover completo
