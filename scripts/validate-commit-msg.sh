#!/usr/bin/env bash

set -euo pipefail

show_help() {
  cat <<'EOF'
Valida mensagens de commit no padrao Conventional Commits.

Uso:
  scripts/validate-commit-msg.sh "tipo(escopo): mensagem"
  scripts/validate-commit-msg.sh /caminho/arquivo-msg

Tipos permitidos:
  feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

Exemplos validos:
  feat(dashboard): adicionar alertas criticos
  fix(rooms): corrigir barra de progresso em tempo real
  chore: atualizar dependencias
EOF
}

if [[ "${1-}" == "-h" || "${1-}" == "--help" ]]; then
  show_help
  exit 0
fi

if [[ "${1-}" == "--" ]]; then
  shift
fi

if [[ $# -lt 1 ]]; then
  echo "Erro: informe a mensagem ou arquivo de mensagem." >&2
  show_help
  exit 1
fi

input="$1"

if [[ -f "$input" ]]; then
  message="$(sed -n '1p' "$input")"
else
  message="$input"
fi

# Permite commits de merge/revert gerados pelo Git.
if [[ "$message" =~ ^Merge[[:space:]] ]] || [[ "$message" =~ ^Revert[[:space:]] ]]; then
  exit 0
fi

pattern='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._/-]+\))?(!)?: .+'

if [[ "$message" =~ $pattern ]]; then
  exit 0
fi

cat <<EOF
Mensagem de commit invalida:
  $message

Formato esperado:
  tipo(escopo): descricao
  tipo: descricao

Tipos aceitos:
  feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert

Exemplos:
  feat(dashboard): adicionar grafico de manutencao por prioridade
  fix(rooms): corrigir timezone de brasilia na progressao
  chore: atualizar scripts de automacao
EOF

exit 1
