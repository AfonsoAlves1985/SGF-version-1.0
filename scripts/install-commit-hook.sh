#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
hook_path="$repo_root/.git/hooks/commit-msg"

cat > "$hook_path" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
"$repo_root/scripts/validate-commit-msg.sh" "$1"
EOF

chmod +x "$hook_path"

echo "Hook instalado em: $hook_path"
echo "Agora qualquer 'git commit' manual sera validado pelo padrao semantico."
