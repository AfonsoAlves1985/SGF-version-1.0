# Descontinuacao do Modulo Contratos

## Decisao
- Modulo de contratos nao sera utilizado no SGF.
- Objetivo: simplificar navegacao e foco operacional.

## O que foi removido
- Rota `/contracts` no frontend.
- Item "Contratos" no menu lateral.
- Card de "Contratos" na Home.
- KPI/dialog/metricas de contratos no Dashboard.
- Label de modulo de contratos na tela de Logs.
- Endpoints tRPC de contratos no backend:
  - `contractSpaces`
  - `contractsWithSpace`

## Arquivos impactados
- `client/src/App.tsx`
- `client/src/components/DashboardLayout.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/Dashboard.tsx`
- `client/src/pages/Logs.tsx`
- `server/routers.ts`
- `client/src/pages/Contracts.tsx` (removido)

## Observacao de dados
- A remocao foi funcional (UI/API), sem limpeza destrutiva de tabelas historicas.
- Se houver necessidade futura, o modulo pode voltar por reintroducao controlada.

## Dependencias
- Impacta leitura de [[SGF Brain - Index]] e reduz ruido no [[Deploy e Validacao]].

## Veja tambem
- [[Pos-migracao Banco e Servidor]]
