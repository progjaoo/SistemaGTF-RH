# Automacao Sistema RH - Enquete de Almoco no WhatsApp

Este pacote sobe n8n + WAHA e importa um workflow para:

1. Enviar uma enquete diaria no grupo do WhatsApp.
2. Capturar os votos da enquete via webhook `poll.vote`.
3. Enviar a apuracao para a gestora as 18h.

## Decisao de arquitetura do workflow

O workflow usa **webhook de votos** em vez de buscar os votos por polling no fim do dia.

Motivo: a documentacao publica atual do WAHA documenta `POST /api/sendPoll` e eventos `poll.vote` / `poll.vote.failed`, mas nao expõe claramente um endpoint estavel de "buscar todos os votos de uma enquete". A propria documentacao de polls recomenda salvar o ID da enquete retornado por `POST /api/sendPoll` e correlacionar os eventos `poll.vote` recebidos depois.

Referencia WAHA:

- Quick Start mostra imagem `devlikeapro/waha`, dashboard, API key e `POST /api/sendText`.
- Configuracao lista `WHATSAPP_DEFAULT_ENGINE=NOWEB`, `WAHA_API_KEY`, `WHATSAPP_HOOK_URL` e `WHATSAPP_HOOK_EVENTS`.
- Polls documenta o evento `poll.vote`, `selectedOptions`, `poll.id` e `poll.vote.failed`.
- OpenAPI JSON lista o schema `MessagePollRequest` com `poll.name`, `poll.options` e `multipleAnswers`.

Na pratica:

- Fluxo A salva a enquete do dia em **Workflow Static Data** do n8n.
- O webhook salva cada voto recebido no mesmo Static Data.
- Fluxo B le esse armazenamento as 18h e envia o resumo para a gestora.

Essa abordagem evita servico externo pago e funciona dentro do proprio n8n.

## Arquivos

```text
automacao-sistema/
├── docker-compose.yml
├── .env.example
├── workflow-enquete-almoco.json
└── README.md
```

## Subir containers

```bash
cd Sistema-RH/automacao-sistema
cp .env.example .env
nano .env
docker compose up -d
```

Acessos padrao:

```text
n8n:  http://localhost:5678
WAHA: http://localhost:3000/dashboard
Swagger WAHA: http://localhost:3000/swagger.html
```

## Variaveis obrigatorias no `.env`

Preencha pelo menos:

```env
N8N_ENCRYPTION_KEY=troque_por_uma_chave_longa_aleatoria
N8N_BASIC_AUTH_PASSWORD=troque_por_uma_senha_forte

WAHA_API_KEY=troque_por_uma_api_key_longa
WAHA_DASHBOARD_PASSWORD=troque_por_uma_senha_forte

WA_GROUP_ID=preencher_depois@g.us
WA_MANAGER_CHAT_ID=preencher_depois@c.us
```

Formato esperado:

- Grupo: `1234567890@g.us`
- Pessoa em mensagem direta: `5511999999999@c.us`

## Parear WhatsApp no WAHA

Este passo e manual e nao deve ser automatizado.

1. Abra `http://localhost:3000/dashboard`.
2. Entre com `WAHA_DASHBOARD_USERNAME` e `WAHA_DASHBOARD_PASSWORD`.
3. Use a `WAHA_API_KEY` quando o dashboard pedir a chave.
4. Crie/inicie a sessao `default` ou o nome configurado em `WAHA_SESSION_NAME`.
5. Escaneie o QR code com o WhatsApp do numero dedicado.
6. Aguarde o status da sessao ficar `WORKING`.

Recomendacao: use um numero dedicado para automacao, nao um numero pessoal.

## Configurar webhook do WAHA

O `docker-compose.yml` ja configura:

```env
WHATSAPP_HOOK_URL=http://n8n:5678/webhook/waha-poll-vote
WHATSAPP_HOOK_EVENTS=poll.vote,poll.vote.failed
```

Quando o workflow estiver importado e ativado, o n8n passa a responder nesse endpoint.

Se preferir configurar a sessao manualmente no WAHA, use um webhook com eventos:

```text
poll.vote
poll.vote.failed
```

## Como pegar o ID do grupo

Com a sessao `WORKING`, liste os chats no Swagger ou via curl:

```bash
curl -X GET "http://localhost:3000/api/messages?session=default&limit=1&chatId=SEU_GRUPO@g.us" \
  -H "Accept: application/json" \
  -H "X-Api-Key: SUA_WAHA_API_KEY"
```

Para descobrir grupos, use o Swagger em:

```text
http://localhost:3000/swagger.html
```

Procure endpoints de chats/grupos, por exemplo:

```text
GET /api/{session}/chats
GET /api/{session}/groups
GET /api/messages
```

O ID de grupo normalmente termina com:

```text
@g.us
```

## Como pegar o contato da gestora

O WAHA usa chatId de contato no formato:

```text
55DDDNUMERO@c.us
```

Exemplo ficticio:

```text
5511999999999@c.us
```

Preencha:

```env
WA_MANAGER_CHAT_ID=5511999999999@c.us
```

## Resolver nomes dos funcionarios

O evento `poll.vote` pode vir apenas com o telefone/ID do votante. Para a mensagem final sair com nomes, configure `CONTACT_NAME_MAP`:

```env
CONTACT_NAME_MAP={"5511999999999@c.us":"Ana Paula","5511888888888":"Bruno Santos"}
```

Tambem e possivel configurar uma lista esperada para apontar quem nao respondeu ate 18h:

```env
EXPECTED_PARTICIPANTS=[{"id":"5511999999999@c.us","name":"Ana Paula"},{"id":"5511888888888@c.us","name":"Bruno Santos"}]
```

Se essa lista nao for configurada, o resumo avisa a gestora para conferir manualmente quem esqueceu de responder.

## Importar workflow no n8n

1. Abra `http://localhost:5678`.
2. Entre no n8n.
3. Va em `Workflows`.
4. Clique em `Import from File`.
5. Selecione `workflow-enquete-almoco.json`.
6. Revise os nodes HTTP.
7. Ative o workflow.

O workflow importado chama variaveis via `$env`, entao nao grava credenciais no JSON.

Para teste de ponta a ponta com webhook real do WAHA, deixe o workflow ativo. Em testes manuais com workflow inativo, o n8n usa URLs de teste (`/webhook-test/...`) e o WAHA configurado no compose chama a URL de producao (`/webhook/...`).

## Fluxos

### Fluxo A - Disparar enquete

Trigger:

```text
Cron - Disparar enquete 11h
```

Cron atual:

```text
0 11 * * 1-5
```

Comportamento:

1. Monta pergunta: `Quem pegou almoço hoje?`
2. Opcoes:
   - `Eu peguei`
   - `Nao peguei`
3. Define `multipleAnswers: false`.
4. Envia `POST /api/sendPoll` no WAHA.
5. Salva no Workflow Static Data:
   - data do dia
   - ID pre-gerado
   - ID retornado pelo WAHA
   - grupo
   - votos vazios

### Webhook - Capturar votos

Trigger:

```text
Webhook - Receber voto WAHA
```

Path:

```text
/webhook/waha-poll-vote
```

Comportamento:

1. Recebe `poll.vote` ou `poll.vote.failed`.
2. Confere se o voto pertence a enquete ativa.
3. Salva o voto mais recente por pessoa.
4. Se a pessoa mudar de opcao, o timestamp mais recente prevalece.

### Fluxo B - Apurar e notificar gestora

Trigger:

```text
Cron - Apurar 18h
```

Cron atual:

```text
0 18 * * 1-5
```

Comportamento:

1. Le a enquete do dia no Workflow Static Data.
2. Filtra quem marcou `Eu peguei`.
3. Monta mensagem:

```text
🍽️ *Almoço de hoje (DD/MM)*

Confirmaram almoço (N):
• Nome 1
• Nome 2

Sem resposta na lista esperada:
• Nome 3

Favor confirmar manualmente com essas pessoas antes do lançamento.
```

4. Envia DM para `WA_MANAGER_CHAT_ID` via `POST /api/sendText`.

## Teste manual

### Testar WAHA

```bash
curl -X POST "http://localhost:3000/api/sendText" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: SUA_WAHA_API_KEY" \
  -d '{
    "session": "default",
    "chatId": "5511999999999@c.us",
    "text": "Teste WAHA Sistema RH"
  }'
```

### Testar Fluxo A sem esperar cron

No n8n:

1. Abra o workflow.
2. Clique no node `Cron - Disparar enquete 11h`.
3. Execute o node manualmente.
4. Siga a execucao ate `WAHA - Enviar Poll`.
5. Confira se a enquete apareceu no grupo.

### Testar webhook de votos

Depois de votar na enquete pelo WhatsApp:

1. Abra as execucoes do n8n.
2. Procure uma execucao iniciada por `Webhook - Receber voto WAHA`.
3. Verifique a saida do node `Salvar voto em static data`.

Se nao aparecer execucao:

- confirme que o workflow esta ativo;
- confirme `WHATSAPP_HOOK_URL`;
- confirme `WHATSAPP_HOOK_EVENTS=poll.vote,poll.vote.failed`;
- veja logs do WAHA:

```bash
docker logs -f sistema-rh-waha
```

### Testar Fluxo B sem esperar 18h

No n8n:

1. Abra o workflow.
2. Clique no node `Cron - Apurar 18h`.
3. Execute manualmente.
4. Verifique se a gestora recebeu a DM.

## Observacoes importantes

1. WAHA com NOWEB/WhatsApp Web nao e API oficial do WhatsApp.
2. Existe risco de bloqueio do numero em uso abusivo ou comportamento automatizado agressivo.
3. Use numero dedicado.
4. Valide os endpoints no Swagger da sua versao instalada:

```text
http://localhost:3000/swagger.html
https://waha.devlike.pro/swagger.html
```

5. A estrutura de `poll.vote` pode mudar entre versoes. O Code node foi escrito defensivamente, mas valide o payload real antes de producao.
6. Se `poll.vote.failed` ocorrer, o resumo avisa a gestora para conferir manualmente.

## Referencias

- WAHA docs: https://waha.devlike.pro
- WAHA Swagger: https://waha.devlike.pro/swagger.html
- WAHA OpenAPI JSON: https://waha.devlike.pro/swagger/openapi.json
- n8n: https://docs.n8n.io
