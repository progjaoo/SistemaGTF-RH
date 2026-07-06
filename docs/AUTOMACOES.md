# Automações

## Diretório

As automações ficam em:

```text
automacao-sistema/
```

## Stack

- n8n para orquestração.
- WAHA para integração WhatsApp HTTP.
- Docker Compose isolado.

## Enquete de Almoço

Objetivo:

1. Enviar enquete diária no grupo de WhatsApp.
2. Capturar votos via webhook.
3. Enviar resumo para a gestora no fim do dia.

Arquivos:

```text
automacao-sistema/docker-compose.yml
automacao-sistema/.env.example
automacao-sistema/workflow-enquete-almoco.json
automacao-sistema/README.md
```

## Regras

- Não colocar número real, token ou API key no Git.
- IDs de grupo e contato devem vir de `.env`.
- Workflow do n8n deve ser importável diretamente.
- Webhook real exige workflow ativo no n8n.
- Estrutura de eventos do WAHA deve ser validada na versão instalada.

## WAHA

WAHA com engine NOWEB/WhatsApp Web não é API oficial do WhatsApp.

Riscos:

- bloqueio do número;
- mudanças de payload entre versões;
- sessão desconectada;
- QR code precisar ser refeito.

Recomendações:

- usar número dedicado;
- evitar spam;
- testar primeiro em grupo pequeno;
- conferir logs do WAHA;
- manter documentação do workflow atualizada.

## n8n

O workflow usa:

- cron para envio;
- webhook para votos;
- cron para apuração;
- Workflow Static Data para correlação entre enquete e votos.

## Checklist para Nova Automação

- [ ] Criar pasta ou arquivo dentro de `automacao-sistema`.
- [ ] Adicionar `.env.example`.
- [ ] Não versionar `.env`.
- [ ] Documentar setup manual.
- [ ] Documentar como testar.
- [ ] Documentar riscos operacionais.
- [ ] Validar JSON antes de entregar.
