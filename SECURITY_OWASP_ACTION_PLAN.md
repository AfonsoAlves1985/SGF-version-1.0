# Plano de ação OWASP (rápido)

Data base: 05-04-2026

## Status atual

- Black-box funcional: OK (`pnpm smoke:modules` com 0 falhas)
- A07 (auth): mitigado com lockout/rate-limit e bloqueio de credencial padrão em produção
- A05 (misconfig/path traversal): mitigado para endpoints de download e headers de hardening
- A06 (componentes vulneráveis): pendente de rodada dedicada de upgrade

## Priorização de upgrades (A06)

### P0 (alta prioridade)

1. `@trpc/server` para `>=11.8.0`
2. `axios` para `>=1.13.5`
3. `path-to-regexp` transitivo para `>=0.1.13`
4. `lodash` e `lodash-es` para versões corrigidas

### P1 (avaliar impacto)

1. cadeia `fast-xml-parser` via AWS SDK/transitivos
2. `qs` transitivo para `>=6.14.2`

### P2 (monitorar / aceitar risco temporário)

1. `xlsx` (pacote npm sem patch oficial estável em alguns advisories)
   - mitigação operacional: não processar planilhas não confiáveis sem sandbox

## Rotina sugerida (semanal)

1. `pnpm smoke:modules`
2. `pnpm audit --prod --json`
3. consolidar lista de `critical/high`
4. aplicar upgrade por lote pequeno
5. validar com `pnpm check` + smoke

## Critérios de aceite

- zero regressão funcional nos módulos principais
- sem falha de auth ou schema no smoke
- redução progressiva de advisories `critical/high`
