# Compras e Integracao FRZ COUNT

## Cenario
- O SGF envia solicitacoes de compra para o FRZ COUNT.
- A aprovacao/reprovacao acontece depois, por analise do gestor.
- O retorno e assincrono e volta para o SGF via callback HTTP.

## Saida SGF -> FRZ COUNT
- Procedimento: `purchaseRequests.sendWebhook`.
- Envia envelope com `event`, `requestId`, `actor`, `data` e `integration.callbackUrl`.
- `callbackUrl` depende de `FRZ_PURCHASE_CALLBACK_URL` no ambiente.

## Retorno FRZ COUNT -> SGF (callback)
- Endpoint padrao: `/api/integrations/frz-count/purchase-approvals`.
- Header obrigatorio: `Authorization: Bearer <FRZ_PURCHASE_CALLBACK_TOKEN>`.
- Payload minimo:
  - `requestId` ou `documentNumber`
  - `decision` (`approved`, `rejected`, `pending`)
- Campos opcionais: `externalRequestId`, `decidedBy`, `decidedAt`, `reason`, `message`.

## Regras de mapeamento
- `approved` -> `status=aprovado`, `financeApproved=true`.
- `rejected` -> `status=cancelado`, `financeApproved=false`.
- `pending` -> `status=financeiro`, `financeApproved=false`.

## Confiabilidade implementada
- Callback com idempotencia: eventos duplicados nao reaplicam decisao.
- Telemetria de integracao persistida em `purchase_requests`.
- Retry de webhook de saida em falhas transitorias (ate 3 tentativas).
- Retorno do callback informa `applied` e `idempotent`.

## Persistencia adicionada em `purchase_requests`
- `externalRequestId`
- `externalApprovalStatus`
- `externalApprovedBy`
- `externalApprovedAt`
- `externalApprovalReason`
- `externalApprovalPayload`
- `integrationWebhookAttempts`
- `integrationWebhookLastAttemptAt`
- `integrationWebhookLastDeliveredAt`
- `integrationWebhookLastStatus`
- `integrationWebhookLastStatusCode`
- `integrationWebhookLastError`
- `integrationCallbackAttempts`
- `integrationCallbackLastAt`
- `integrationCallbackLastStatus`
- `integrationCallbackLastDecision`
- `integrationCallbackLastError`

## Arquivos chave
- `server/routers.ts` (envio webhook de compras)
- `server/_core/index.ts` (endpoint callback FRZ COUNT)
- `server/_core/env.ts` (variaveis de ambiente)
- `server/db.ts` (aplicacao de decisao externa)
- `drizzle/0008_purchase_requests_external_approval.sql` (migracao)
- `drizzle/0009_purchase_requests_integration_tracking.sql` (telemetria webhook/callback)
- `client/src/pages/PurchaseRequests.tsx` (status de integracao na lista e no modal)
- `docs/INTEGRACAO_FRZ_COUNT_SOLICITACOES_COMPRA.md` (contrato tecnico)

## Dependencias
- Depende de [[Deploy e Validacao]] para configurar token/path/url e testar callback.
- Compartilha governanca com [[Regras de Permissao e Seguranca]].
- [[Assistente Mr. Thinkker]] usa webhook/callback como fonte de dados para resposta de consultas em compras.

## Veja tambem
- [[Pos-migracao Banco e Servidor]]
- [[Acessos e Convites]]
- [[Inventario por Unidade e Bens]]
- [[Tema Visual Azul]]
- [[Linha do Tempo de Entregas]]
- [[SGF Brain - Index]]
