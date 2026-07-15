# 📊 Stats (Estatísticas)

> **Rota:** `/events/[eventId]/stats`
> **Tipo:** Página de evento

---

## O que é?

Gerencia todas as informações técnicas dos **lutadores** e **coaches**: estatísticas de luta, dados físicos, e tamanhos de uniforme.

---

## Abas

### Fighter Stats
Dados do lutador:
| Campo | Exemplo |
|-------|---------|
| Nickname | "The Beast" |
| Weight Class | Welterweight |
| Height / Reach | 180cm / 185cm |
| Fighting Style | Boxing, Muay Thai |
| Team/Gym | Team Alpha |
| Record | 15W-3L-1D |
| Record detalhado | Wins by KO/Sub/Dec, Losses by KO/Sub/Dec |
| Corner | RED / BLUE |

### Uniforms
Tamanhos de equipamento:
- Uniform Size, T-shirt, Shorts, Jacket, Shoe, Gloves

### Weigh-Ins (Pesagens)
Registro de pesagens dos lutadores.

### Coach Data
Dados dos treinadores/corners.

### History
Histórico de alterações em stats.

---

## Visualizações
- **Table** — tabela com todos os dados
- **Cards** — cartões visuais por lutador

---

## Importação CSV
Via [[17 - Importação CSV]]:
- Identificação pelo **Passport Name** → match com lutador inscrito no evento (role = `F`)
- Campos importáveis: nickname, weight class, height, reach, fighting style, team, record, uniform sizes
- Sempre **upsert** — cria se não existir, atualiza se já existir

---

## Por que existe?

Porque a organização precisa de dados técnicos para:
1. Montar o [[12 - Fight Card]] (record, peso, estilo)
2. Preparar uniformes (tamanhos exatos)
3. Comunicação com broadcasters e mídia

---

## Conexões
- **Depende de:** [[06 - Detalhe do Evento]] (apenas lutadores inscritos com role F)
- **Alimenta:** [[12 - Fight Card]] (record, nickname, foto)
- **Template CSV:** [[17 - Importação CSV]]
