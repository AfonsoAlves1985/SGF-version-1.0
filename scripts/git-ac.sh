#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Uso:
  pnpm ac --help
  pnpm ac -- "mensagem do commit"
  ./scripts/git-ac.sh "mensagem do commit"

Descricao:
  Faz git add -A, commit e push na branch atual.

Opcao:
  -h, --help   Mostra esta ajuda.
EOF
}

if [[ "${1-}" == "--" ]]; then
  shift
fi

if [[ "${1-}" == "-h" || "${1-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "$#" -lt 1 ]]; then
  echo "Erro: informe a mensagem do commit." >&2
  usage
  exit 1
fi

message="$*"

if git diff --quiet && git diff --cached --quiet; then
  echo "Nada para commitar (working tree limpo)."
  exit 0
fi

author_name="${GIT_AUTHOR_NAME-}"
author_email="${GIT_AUTHOR_EMAIL-}"

if [[ -z "$author_name" ]]; then
  author_name="$(git config --get user.name || true)"
fi
if [[ -z "$author_email" ]]; then
  author_email="$(git config --get user.email || true)"
fi

if [[ -z "$author_name" ]]; then
  author_name="$(git log -1 --format='%an' 2>/dev/null || true)"
fi
if [[ -z "$author_email" ]]; then
  author_email="$(git log -1 --format='%ae' 2>/dev/null || true)"
fi

if [[ -z "$author_name" || -z "$author_email" ]]; then
  echo "Erro: nao foi possivel determinar autor para o commit." >&2
  echo "Defina GIT_AUTHOR_NAME e GIT_AUTHOR_EMAIL e tente novamente." >&2
  exit 1
fi

branch="$(git symbolic-ref --quiet --short HEAD)"

git add -A

if git diff --cached --quiet; then
  echo "Nenhuma mudanca apos git add -A."
  exit 0
fi

GIT_AUTHOR_NAME="$author_name" \
GIT_AUTHOR_EMAIL="$author_email" \
GIT_COMMITTER_NAME="$author_name" \
GIT_COMMITTER_EMAIL="$author_email" \
git commit -m "$message"

# Se o hook post-commit ja fizer push, este comando apenas retorna "Everything up-to-date".
git push origin "$branch"

echo "Concluido: commit e push em origin/$branch"
