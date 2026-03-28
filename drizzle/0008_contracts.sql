-- Criar tabela de contratos
CREATE TABLE IF NOT EXISTS `contracts` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `companyName` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `contractType` enum('mensal', 'anual') NOT NULL,
  `value` decimal(10, 2) NOT NULL,
  `signatureDate` date NOT NULL,
  `endDate` date NOT NULL,
  `monthlyPaymentDate` int,
  `documentUrl` text,
  `status` enum('ativo', 'inativo', 'vencido') DEFAULT 'ativo' NOT NULL,
  `notes` text,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Criar tabela de contratos por espaço
CREATE TABLE IF NOT EXISTS `contracts_with_space` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `spaceId` int NOT NULL,
  `contractId` int NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`spaceId`) REFERENCES `consumable_spaces`(`id`),
  FOREIGN KEY (`contractId`) REFERENCES `contracts`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Criar tabela de alertas de contratos
CREATE TABLE IF NOT EXISTS `contract_alerts` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `contractId` int NOT NULL,
  `spaceId` int NOT NULL,
  `alertType` enum('monthly_payment', 'contract_expiry') NOT NULL,
  `daysUntilEvent` int NOT NULL,
  `isResolved` boolean DEFAULT false NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `resolvedAt` timestamp,
  FOREIGN KEY (`contractId`) REFERENCES `contracts`(`id`),
  FOREIGN KEY (`spaceId`) REFERENCES `consumable_spaces`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
