# Regras de Permissao e Seguranca

## Perfis
- `superadmin` (owner)
- `admin`
- `editor`
- `viewer`

## Regras consolidadas
- Nenhum perfil pode se autoexcluir.
- Apenas owner pode excluir usuarios.
- Owner nao pode ser excluido, alterado ou desativado.
- Admin pode acessar administracao de acessos, mas nao pode excluir usuarios.
- Consultas sensiveis no [[Assistente Mr. Thinkker]] (usuarios/acessos/auditoria) sao apenas para Owner.

## Dependencias
- Base para [[Acessos e Convites]].
- Base para governanca de [[Inventario por Unidade e Bens]] quando houver regras por perfil.
- Apoia a governanca operacional de [[Compras e Integracao FRZ COUNT]].
- Base para respostas seguras do [[Assistente Mr. Thinkker]].

## Pontos de backend
- Router de acessos com validacoes de papel e alvo.
- Garantia dupla para owner: por `role` e por `OWNER_OPEN_ID`.

## Testes de regra (checklist)
- Admin tentando excluir usuario -> deve falhar.
- Owner tentando excluir a si proprio -> deve falhar.
- Owner tentando excluir outro owner -> deve falhar.
- Owner excluindo usuario desativado comum -> deve passar.

## Veja tambem
- [[Deploy e Validacao]]
- [[Pos-migracao Banco e Servidor]]
- [[Assistente Mr. Thinkker]]
- [[Linha do Tempo de Entregas]]
- [[SGF Brain - Index]]
