# Integracao FRZ COUNT - Solicitacoes de Compra

Este documento define o contrato de integracao assíncrona entre SGF e FRZ COUNT.

## Fluxo

1. SGF envia a solicitacao para o webhook do FRZ COUNT.
2. FRZ COUNT processa internamente e aguarda parecer do gestor.
3. Quando houver decisao, FRZ COUNT chama o callback do SGF.

## Variaveis de ambiente (SGF)

- `FRZ_PURCHASE_CALLBACK_TOKEN` (obrigatoria): token Bearer que o FRZ COUNT usa no callback.
- `FRZ_PURCHASE_CALLBACK_PATH` (opcional): caminho do callback no SGF.
  - Default: `/api/integrations/frz-count/purchase-approvals`
- `FRZ_PURCHASE_CALLBACK_URL` (opcional): URL publica completa do callback.
  - Exemplo: `https://sgf.seudominio.com/api/integrations/frz-count/purchase-approvals`
  - Quando preenchida, o SGF inclui essa URL no payload enviado ao FRZ COUNT.

## Webhook de saida (SGF -> FRZ COUNT)

O SGF envia `POST` JSON para a URL configurada no modulo de solicitacoes.

Campos relevantes do envelope:

- `event`: `purchase_request.created` ou `purchase_request.updated`
- `requestId`: id interno da solicitacao no SGF
- `responsibleEmail`: email definido na configuracao do modulo (opcional)
- `actor`: usuario que gerou/alterou a solicitacao
- `integration.callbackUrl`: URL publica para callback (se `FRZ_PURCHASE_CALLBACK_URL` estiver definida)
- `data`: solicitacao completa com itens

## Callback de retorno (FRZ COUNT -> SGF)

### Endpoint

- Metodo: `POST`
- URL: `<SGF_BASE_URL><FRZ_PURCHASE_CALLBACK_PATH>`
- Header obrigatorio:
  - `Authorization: Bearer <FRZ_PURCHASE_CALLBACK_TOKEN>`

### Body JSON

Envie `requestId` ou `documentNumber` para identificar a solicitacao.

```json
{
  "requestId": 123,
  "documentNumber": "SC-2026-0001",
  "externalRequestId": "FRZ-9981",
  "decision": "approved",
  "decidedBy": "gestor@frzcount.com",
  "decidedAt": "2026-04-09T18:30:00Z",
  "reason": null,
  "message": "Solicitacao aprovada pelo gestor"
}
```

### Regras do campo `decision`

- `approved` -> SGF atualiza para `status=aprovado` e `financeApproved=true`
- `rejected` -> SGF atualiza para `status=cancelado` e `financeApproved=false`
- `pending` -> SGF atualiza para `status=financeiro` e `financeApproved=false`

### Resposta do SGF

Sucesso (`200`):

```json
{
  "ok": true,
  "requestId": 123,
  "documentNumber": "SC-2026-0001",
  "status": "aprovado",
  "decision": "approved"
}
```

Erros comuns:

- `401`: token invalido
- `400`: payload invalido (`decision` invalido ou sem `requestId/documentNumber`)
- `503`: callback nao configurado no SGF

## Rastreabilidade no banco

No callback, o SGF salva no `purchase_requests`:

- `externalRequestId`
- `externalApprovalStatus`
- `externalApprovedBy`
- `externalApprovedAt`
- `externalApprovalReason`
- `externalApprovalPayload`

Tambem anexa observacoes no campo `observations` com prefixo `[FRZ COUNT]`.

## Exemplo cURL (callback)

```bash
curl -X POST "https://sgf.seudominio.com/api/integrations/frz-count/purchase-approvals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "requestId": 123,
    "decision": "approved",
    "externalRequestId": "FRZ-9981",
    "decidedBy": "gestor@frzcount.com",
    "decidedAt": "2026-04-09T18:30:00Z",
    "message": "Aprovado"
  }'
```
