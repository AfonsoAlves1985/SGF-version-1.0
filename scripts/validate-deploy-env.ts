type EnvCheck = {
  key: string;
  required: boolean;
  validator?: (value: string) => string | null;
};

const env = process.env;

function nonEmpty(value?: string) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "deve usar protocolo http/https";
    }
    return null;
  } catch {
    return "URL inválida";
  }
}

function validateJwtSecret(value: string) {
  if (value.length < 32) {
    return "deve ter pelo menos 32 caracteres";
  }
  return null;
}

function validateDatabaseUrl(value: string) {
  const error = validateUrl(value);
  if (error) return error;
  if (!value.includes("postgres")) {
    return "esperado DATABASE_URL de PostgreSQL";
  }
  return null;
}

function buildChecks(): EnvCheck[] {
  const hasFrzIntegration =
    nonEmpty(env.FRZ_PURCHASE_CALLBACK_TOKEN) ||
    nonEmpty(env.FRZ_PURCHASE_CALLBACK_URL) ||
    nonEmpty(env.FRZ_PURCHASE_CALLBACK_PATH);

  return [
    {
      key: "NODE_ENV",
      required: true,
      validator: value =>
        value === "production" ? null : "deve ser production para deploy",
    },
    {
      key: "DATABASE_URL",
      required: true,
      validator: validateDatabaseUrl,
    },
    {
      key: "JWT_SECRET",
      required: true,
      validator: validateJwtSecret,
    },
    {
      key: "OWNER_OPEN_ID",
      required: false,
    },
    {
      key: "FRZ_PURCHASE_CALLBACK_TOKEN",
      required: hasFrzIntegration,
    },
    {
      key: "FRZ_PURCHASE_CALLBACK_URL",
      required: false,
      validator: value => (value.trim().length === 0 ? null : validateUrl(value)),
    },
    {
      key: "FRZ_PURCHASE_CALLBACK_PATH",
      required: false,
      validator: value =>
        value.startsWith("/") ? null : "deve iniciar com / (ex: /api/integrations/...)",
    },
  ];
}

function run() {
  const checks = buildChecks();
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const check of checks) {
    const value = env[check.key];

    if (check.required && !nonEmpty(value)) {
      errors.push(`${check.key}: variável obrigatória ausente`);
      continue;
    }

    if (!nonEmpty(value)) {
      warnings.push(`${check.key}: não definida (opcional no cenário atual)`);
      continue;
    }

    if (check.validator) {
      const validationError = check.validator(value!.trim());
      if (validationError) {
        errors.push(`${check.key}: ${validationError}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.log("[deploy-env] Avisos:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error("[deploy-env] Falhas encontradas:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("[deploy-env] OK: variáveis críticas validadas.");
}

run();
