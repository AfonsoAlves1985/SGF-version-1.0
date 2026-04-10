# Validacao Pos-Deploy

Checklist operacional para validar o sistema apos deploy em producao.

## 1) Hardening de ambiente (antes do deploy)

Execute no ambiente alvo:

```bash
pnpm deploy:check-env
```

Valida variaveis criticas:
- `NODE_ENV` (production)
- `DATABASE_URL`
- `JWT_SECRET`
- `FRZ_PURCHASE_CALLBACK_*` (quando integracao estiver ativa)

## 2) Smoke automatizado (apos deploy)

Configure:
- `APP_BASE_URL`
- `SMOKE_USER` (ou `SMOKE_EMAIL`)
- `SMOKE_PASSWORD`

Execute:

```bash
pnpm smoke:modules
```

Ou em uma linha:

```bash
pnpm deploy:postcheck
```

## 3) Cobertura esperada do smoke

- `auth.me`
- dashboard/alertas
- salas e reservas
- manutencao
- equipes
- inventario
- consumiveis
- fornecedores
- solicitacoes de compra
- `assistant.ask` (Mr. Thinkker)

## 4) Validacoes manuais rapidas

1. `GET /healthz` retorna 200.
2. Compra com webhook FRZ e callback (`approved` e `rejected`).
3. Inventario com campo `responsavel` (cadastro/edicao/busca).
4. Mr. Thinkker com resposta por modulo/unidade/informacao.
5. Consulta sensivel (usuarios/logs) bloqueada para nao-owner.

## 5) Critério de aceite

- Sem falhas no `deploy:check-env`.
- Sem falhas no `smoke:modules`.
- Validacoes manuais aprovadas.
