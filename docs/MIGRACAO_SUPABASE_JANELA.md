# Migração Supabase por Janela de Manutenção

Este roteiro migra o banco PostgreSQL de uma conta Supabase para outra com
janela curta de indisponibilidade.

## Pré-requisitos

- Novo projeto Supabase criado.
- Credenciais de origem e destino:
  - `SRC_DATABASE_URL`
  - `DST_DATABASE_URL`
- Ferramentas instaladas localmente:
  - `pg_dump`, `pg_restore`, `psql`

## Estratégia recomendada

1. Congelar gravações (janela de manutenção).
2. Tirar dump da origem.
3. Restaurar no destino.
4. Validar contagem de tabelas.
5. Trocar `DATABASE_URL` do backend.
6. Validar módulos críticos.

## Execução (com script do projeto)

No root do repositório:

```bash
SRC_DATABASE_URL="postgresql://..." \
DST_DATABASE_URL="postgresql://..." \
bash scripts/migrate-supabase-maintenance.sh
```

Se o destino já tiver dados e você quiser limpar antes de restaurar:

```bash
SRC_DATABASE_URL="postgresql://..." \
DST_DATABASE_URL="postgresql://..." \
DROP_DESTINATION=true \
bash scripts/migrate-supabase-maintenance.sh
```

Arquivos gerados no final:

- `backup/db-migration-.../database.dump`
- `backup/db-migration-.../source-counts.csv`
- `backup/db-migration-.../destination-counts.csv`
- `backup/db-migration-.../counts.diff`

## Após migrar o banco

1. Atualizar variáveis de ambiente de produção (Render):
   - `DATABASE_URL` para o novo banco.
   - manter/validar `JWT_SECRET`.
2. Fazer deploy do backend.
3. Rodar smoke test:

```bash
pnpm smoke:modules
```

4. Validar manualmente:
   - login e convites;
   - manutenção/inventário/fornecedores;
   - solicitação de compras + webhook;
   - logs de auditoria.

## Itens fora do escopo do dump SQL

O script migra apenas PostgreSQL. Ainda é necessário migrar manualmente:

- arquivos de Supabase Storage (buckets/objetos);
- configurações de Auth (providers, templates, SMTP, redirect URLs);
- eventuais funções/integrações externas da conta antiga.

## Rollback

Se algo falhar após o corte:

1. Restaurar `DATABASE_URL` para o banco antigo.
2. Reimplantar backend.
3. Reabrir sistema.
