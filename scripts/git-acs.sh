#!/usr/bin/env bash

set -euo pipefail

show_help() {
  cat <<'EOF'
Cria commit semantico automaticamente (add + commit + push).

Uso:
  pnpm acs -- <tipo> <escopo|-> <descricao>
  pnpm acs -- <tipo> <descricao>

Exemplos:
  pnpm acs -- fix rooms corrigir timezone da barra de progresso
  pnpm acs -- feat dashboard adicionar alertas criticos de estoque
  pnpm acs -- chore atualizar scripts de automacao

Tipos permitidos:
  feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

Notas:
  - Se nao quiser escopo, omita ou use '-'.
  - O comando gera mensagem no formato: tipo(escopo): descricao
EOF
}

if [[ "${1-}" == "--" ]]; then
  shift
fi

if [[ "${1-}" == "-h" || "${1-}" == "--help" || $# -lt 2 ]]; then
  show_help
  exit 0
fi

type="$1"
shift

case "$type" in
  feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert) ;;
  *)
    echo "Erro: tipo invalido '$type'." >&2
    show_help
    exit 1
    ;;
esac

scope=""
if [[ $# -ge 2 ]]; then
  maybe_scope="$1"
  if [[ "$maybe_scope" != "-" ]]; then
    if [[ "$maybe_scope" =~ ^[a-z0-9._/-]+$ ]]; then
      scope="$maybe_scope"
      shift
    fi
  else
    shift
  fi
fi

if [[ $# -lt 1 ]]; then
  echo "Erro: informe a descricao do commit." >&2
  show_help
  exit 1
fi

description="$*"

if [[ -n "$scope" ]]; then
  message="$type($scope): $description"
else
  message="$type: $description"
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$script_dir/git-ac.sh" "$message"
