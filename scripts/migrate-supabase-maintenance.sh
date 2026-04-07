#!/usr/bin/env bash

set -euo pipefail

if [[ "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Migra banco PostgreSQL (Supabase) por janela de manutencao.

Uso:
  SRC_DATABASE_URL="..." DST_DATABASE_URL="..." \
  bash scripts/migrate-supabase-maintenance.sh

Variaveis opcionais:
  BACKUP_DIR=./backup/db-migration-YYYYMMDD-HHMMSS
  DROP_DESTINATION=true|false   (padrao: false)

Observacoes:
  - Este script migra schema + dados do Postgres.
  - Nao migra arquivos do Supabase Storage.
  - Nao migra configuracoes de Auth/SMTP/Providers.
EOF
  exit 0
fi

required_commands=(pg_dump pg_restore psql diff)
for cmd in "${required_commands[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[erro] comando obrigatorio nao encontrado: $cmd" >&2
    exit 1
  fi
done

if [[ -z "${SRC_DATABASE_URL:-}" ]]; then
  echo "[erro] defina SRC_DATABASE_URL" >&2
  exit 1
fi

if [[ -z "${DST_DATABASE_URL:-}" ]]; then
  echo "[erro] defina DST_DATABASE_URL" >&2
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${BACKUP_DIR:-./backup/db-migration-${timestamp}}"
drop_destination="${DROP_DESTINATION:-false}"

mkdir -p "$backup_dir"

dump_file="$backup_dir/database.dump"
src_counts_file="$backup_dir/source-counts.csv"
dst_counts_file="$backup_dir/destination-counts.csv"
counts_diff_file="$backup_dir/counts.diff"

read -r -d '' counts_query <<'SQL' || true
WITH table_counts AS (
  SELECT
    tablename,
    COALESCE(
      (
        xpath(
          '/row/cnt/text()',
          query_to_xml(
            format('select count(*) as cnt from %I.%I', schemaname, tablename),
            false,
            true,
            ''
          )
        )
      )[1]::text::bigint,
      0
    ) AS row_count
  FROM pg_tables
  WHERE schemaname = 'public'
)
SELECT tablename, row_count
FROM table_counts
ORDER BY tablename;
SQL

echo "[1/6] Capturando contagem da origem"
psql "$SRC_DATABASE_URL" -v ON_ERROR_STOP=1 -A -F ',' -t -c "$counts_query" \
  > "$src_counts_file"

echo "[2/6] Gerando dump da origem"
pg_dump "$SRC_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file "$dump_file"

echo "[3/6] Restaurando no destino"
restore_args=(
  --no-owner
  --no-privileges
  --dbname "$DST_DATABASE_URL"
)

if [[ "$drop_destination" == "true" ]]; then
  restore_args+=(--clean --if-exists)
fi

pg_restore "${restore_args[@]}" "$dump_file"

echo "[4/6] Capturando contagem do destino"
psql "$DST_DATABASE_URL" -v ON_ERROR_STOP=1 -A -F ',' -t -c "$counts_query" \
  > "$dst_counts_file"

echo "[5/6] Comparando contagens"
if diff -u "$src_counts_file" "$dst_counts_file" > "$counts_diff_file"; then
  echo "[ok] contagens conferem"
else
  echo "[aviso] divergencias encontradas em contagens" >&2
  echo "        veja: $counts_diff_file" >&2
fi

echo "[6/6] Finalizado"
echo "  dump:              $dump_file"
echo "  contagem origem:   $src_counts_file"
echo "  contagem destino:  $dst_counts_file"
echo "  diff contagens:    $counts_diff_file"

echo
echo "Proximos passos manuais:"
echo "  1) Atualizar DATABASE_URL/JWT_SECRET no ambiente de deploy"
echo "  2) Publicar backend apontando para o novo banco"
echo "  3) Rodar smoke: pnpm smoke:modules"
echo "  4) Validar login, convites, compras e webhook"
