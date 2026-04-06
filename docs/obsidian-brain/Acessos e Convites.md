# Acessos e Convites

## Fluxo final
- Convite gerado manualmente por link.
- Link abre `login?inviteToken=...`.
- Convidado conclui cadastro (login, nome, senha).
- Apos concluir cadastro, volta para tela de login para entrar.

## Token de convite
- Uso unico.
- Ao aceitar, status vira `accepted`.
- Reuso do mesmo link retorna convite invalido/expirado.

## Integracoes
- Depende de [[Regras de Permissao e Seguranca]].
- Conecta com [[Deploy e Validacao]] para smoke test de ponta a ponta.

## UI e pontos de acesso
- Tela: Administracao de Acessos.
- Disponivel para owner e admin.
- Acao de exclusao de usuarios restrita ao owner.

## Checklist de validacao
- Owner gera link.
- Convidado cadastra com token valido.
- Novo usuario faz login normal.
- Segunda tentativa com mesmo token falha.
