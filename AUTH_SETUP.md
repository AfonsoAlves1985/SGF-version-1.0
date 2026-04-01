# Sistema de Autenticação e Autorização - Guia de Setup

## 1. Executar Migration SQL

Copie e execute o SQL abaixo na interface de banco de dados do Manus (Management UI → Database):

```sql
-- Criar tabela de auditoria
CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` enum('create','read','update','delete','login','logout') NOT NULL,
	`module` varchar(100) NOT NULL,
	`recordId` int,
	`recordName` varchar(255),
	`changes` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`status` enum('success','failed') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `audit_log_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action,
	INDEX `audit_log_userId` (`userId`),
	INDEX `audit_log_module` (`module`),
	INDEX `audit_log_createdAt` (`createdAt`)
);

-- Expandir roles de usuários
ALTER TABLE `users` MODIFY COLUMN `role` enum('superadmin','admin','editor','viewer','user') NOT NULL DEFAULT 'viewer';

-- Adicionar campos de autenticação
ALTER TABLE `users` ADD `password` varchar(255);
ALTER TABLE `users` ADD `isActive` int DEFAULT 1 NOT NULL;
ALTER TABLE `users` ADD `lastLogin` timestamp;
```

## 2. Níveis de Acesso (Roles)

| Role | Permissões | Acesso |
|------|-----------|--------|
| **superadmin** | Acesso irrestrito | Tudo, incluindo gestão de admins e logs completos |
| **admin** | Gestão de módulos e usuários | Todos os módulos, gestão de users/editors/viewers |
| **editor** | Leitura e edição | Leitura e edição em todos os módulos |
| **viewer** | Somente leitura | Visualização apenas, sem edição |
| **user** | Legado (compatibilidade) | Equivalente a viewer |

## 3. Hierarquia de Permissões

```
superadmin
    ↓
admin
    ↓
editor
    ↓
viewer
```

- Cada nível pode gerenciar apenas usuários de níveis abaixo
- Superadmin não pode ser editado, deletado ou desativado
- Superadmin criado via seed inicial (variável de ambiente)

## 4. Campos da Tabela `users`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int | ID único |
| openId | varchar | ID do OAuth (Manus) |
| name | text | Nome do usuário |
| email | varchar | Email |
| loginMethod | varchar | Método de login (oauth/local) |
| **password** | varchar | Hash bcrypt (novo) |
| **role** | enum | Nível de acesso (novo: 5 opções) |
| **isActive** | int | Status (1=ativo, 0=desativado) (novo) |
| **lastLogin** | timestamp | Último login (novo) |
| createdAt | timestamp | Data de criação |
| updatedAt | timestamp | Data de atualização |
| lastSignedIn | timestamp | Último acesso OAuth |

## 5. Campos da Tabela `audit_log`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int | ID único |
| userId | int | ID do usuário que fez a ação |
| action | enum | Tipo de ação (create/read/update/delete/login/logout) |
| module | varchar | Módulo afetado (rooms, inventory, users, etc) |
| recordId | int | ID do registro afetado |
| recordName | varchar | Nome/descrição do registro |
| changes | json | Dados antes/depois da mudança |
| ipAddress | varchar | IP do cliente |
| userAgent | text | Browser/client info |
| status | enum | Sucesso ou falha (success/failed) |
| errorMessage | text | Mensagem de erro se falhou |
| createdAt | timestamp | Data/hora da ação |

## 6. Próximos Passos

1. ✅ Schema criado
2. ⏳ Executar SQL na interface de banco de dados
3. ⏳ Implementar autenticação (login/logout com JWT)
4. ⏳ Criar middleware de autorização
5. ⏳ Implementar logging de auditoria
6. ⏳ Criar interface de gestão de usuários
7. ⏳ Criar script de seed para superadmin
8. ⏳ Integrar em todas as rotas
