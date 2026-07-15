# 🎵 Music (Músicas de Entrada)

> **Rota:** `/events/[eventId]/music`
> **Tipo:** Página de evento

---

## O que é?

Gerencia as **músicas de entrada** dos lutadores — cada lutador pode ter até 3 links de música (YouTube, Spotify, etc). A música toca quando o lutador entra no octógono.

---

## O que pode fazer?

### Cadastrar Música
- Selecionar lutador (enrollment com role = `F`)
- Até 3 links de música (link1, link2, link3)
- Status: `pending`, `approved`, `rejected`
- Notas (ex: "Tocar a partir do 0:45")

### Pré-visualizar
Player embutido para ouvir a música antes de aprovar.

### Bulk Download
Botão para baixar todas as músicas aprovadas de uma vez.

### Importação CSV
Via [[17 - Importação CSV]]:
- Identificação pelo **Fighter ID**
- Campos: links de música, notas

---

## Formulário Público de Envio

Existe uma **página pública** onde os lutadores/managers enviam suas músicas sem precisar de login:
- Rota: `/public/music-submission/[eventId]`
- O lutador seleciona seu nome e envia os links
- A equipe depois aprova ou rejeita

---

## Por que existe?

Porque a produção precisa ter as músicas prontas antes do evento. Sem um sistema, chegam por WhatsApp, email, e se perdem. O fluxo público simplifica a coleta.

---

## Conexões
- **Depende de:** [[06 - Detalhe do Evento]] (lutadores inscritos)
- **Template CSV:** [[17 - Importação CSV]]
- **Página pública:** acessível sem login
