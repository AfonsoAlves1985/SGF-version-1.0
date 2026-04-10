type CheckResult = {
  module: string;
  status: "ok" | "error";
  detail: string;
  suspectedTable?: string;
  needsSchemaStrategy: boolean;
};

const baseUrl = process.env.APP_BASE_URL || "https://sgf-online.onrender.com";
const username = process.env.SMOKE_USER || process.env.SMOKE_EMAIL || "";
const password = process.env.SMOKE_PASSWORD || "";

type ProcedureKind = "query" | "mutation";

async function rawTrpcCall(
  path: string,
  kind: ProcedureKind,
  input: unknown,
  token?: string
) {
  const encodedInput = encodeURIComponent(
    JSON.stringify({
      0: { json: input ?? null },
    })
  );

  const headers: Record<string, string> = {};
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const url = `${baseUrl}/api/trpc/${path}?batch=1${kind === "query" ? `&input=${encodedInput}` : ""}`;

  const response = await fetch(url, {
    method: kind === "query" ? "GET" : "POST",
    headers: {
      ...(kind === "mutation" ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body:
      kind === "mutation"
        ? JSON.stringify({
            0: { json: input ?? null },
          })
        : undefined,
  });

  const bodyText = await response.text();

  let parsed: any = null;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = null;
  }

  const trpcErrorMessage = parsed?.[0]?.error?.json?.message as
    | string
    | undefined;
  const ok = response.ok && Boolean(parsed?.[0]?.result);

  return {
    ok,
    status: response.status,
    bodyText,
    parsed,
    trpcErrorMessage,
  };
}

async function rawLogin() {
  const response = await fetch(`${baseUrl}/api/trpc/auth.login?batch=1`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      0: {
        json: {
          email: username,
          password,
        },
      },
    }),
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${bodyText.slice(0, 200)}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error(`Non-JSON login response: ${bodyText.slice(0, 200)}`);
  }

  const token = parsed?.[0]?.result?.data?.json?.token;
  const user = parsed?.[0]?.result?.data?.json?.user;

  if (!token) {
    throw new Error(
      `Missing token in login response: ${bodyText.slice(0, 200)}`
    );
  }

  return { token, user };
}

function extractTableFromError(message: string) {
  const fromMatch = message.match(/from\s+"([^"]+)"/i);
  if (fromMatch?.[1]) return fromMatch[1];

  const relationMatch = message.match(/relation\s+"([^"]+)"/i);
  if (relationMatch?.[1]) return relationMatch[1];

  return undefined;
}

function summarizeError(error: unknown) {
  const defaultMessage = "Unknown error";

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : defaultMessage;
  const lower = message.toLowerCase();
  const table = extractTableFromError(message);
  const missingSchema =
    lower.includes("relation") ||
    lower.includes("column") ||
    lower.includes("failed query") ||
    lower.includes("does not exist");

  return {
    message,
    table,
    needsSchemaStrategy: missingSchema,
  };
}

async function run() {
  console.log(`[smoke] Base URL: ${baseUrl}`);

  if (!username || !password) {
    throw new Error(
      "Missing smoke credentials. Configure SMOKE_USER (or SMOKE_EMAIL) and SMOKE_PASSWORD."
    );
  }

  const healthResponse = await fetch(`${baseUrl}/healthz`, { method: "GET" });
  console.log(
    `[smoke] healthz status=${healthResponse.status} contentType=${
      healthResponse.headers.get("content-type") || "unknown"
    }`
  );

  if (!healthResponse.ok) {
    throw new Error(
      "Service health check failed. Deployment may still be starting."
    );
  }

  let login: { token: string; user?: { email?: string } };

  try {
    login = await rawLogin();
  } catch (error) {
    throw new Error(
      `Login smoke failed: ${error instanceof Error ? error.message : String(error)}. Verify SMOKE_USER/SMOKE_PASSWORD and, if this is HTML/502, wait for deploy completion and retry.`
    );
  }

  if (!login?.token) {
    throw new Error("Login did not return token");
  }

  console.log(`[smoke] Login ok as ${login.user?.email || username}`);

  const checks: Array<{
    module: string;
    kind: ProcedureKind;
    path: string;
    input: unknown;
  }> = [
    { module: "auth.me", kind: "query", path: "auth.me", input: null },
    {
      module: "dashboard.stockAlerts",
      kind: "query",
      path: "dashboard.getStockAlerts",
      input: {},
    },
    {
      module: "rooms.list",
      kind: "query",
      path: "rooms.list",
      input: { status: "all" },
    },
    {
      module: "roomReservations.list",
      kind: "query",
      path: "roomReservations.list",
      input: {},
    },
    {
      module: "maintenance.list",
      kind: "query",
      path: "maintenance.list",
      input: {},
    },
    {
      module: "maintenanceSpaces.list",
      kind: "query",
      path: "maintenanceSpaces.list",
      input: null,
    },
    { module: "teams.list", kind: "query", path: "teams.list", input: {} },
    {
      module: "inventory.list",
      kind: "query",
      path: "inventory.list",
      input: {},
    },
    {
      module: "consumableSpaces.list",
      kind: "query",
      path: "consumableSpaces.list",
      input: null,
    },
    {
      module: "consumablesWithSpace.list",
      kind: "query",
      path: "consumablesWithSpace.list",
      input: {},
    },
    {
      module: "supplierSpaces.list",
      kind: "query",
      path: "supplierSpaces.list",
      input: null,
    },
    {
      module: "suppliersWithSpace.list",
      kind: "query",
      path: "suppliersWithSpace.list",
      input: {},
    },
    {
      module: "purchaseRequests.list",
      kind: "query",
      path: "purchaseRequests.list",
      input: {},
    },
    {
      module: "assistant.ask",
      kind: "mutation",
      path: "assistant.ask",
      input: {
        question: "Me dê uma visão geral do sistema",
        context: {
          path: "/dashboard",
          module: "geral",
        },
      },
    },
  ];

  const results: CheckResult[] = [];

  for (const check of checks) {
    try {
      const call = await rawTrpcCall(
        check.path,
        check.kind,
        check.input,
        login.token
      );

      if (!call.ok) {
        const detail =
          call.trpcErrorMessage ||
          `HTTP ${call.status}: ${call.bodyText.slice(0, 200)}`;
        const summary = summarizeError(new Error(detail));

        results.push({
          module: check.module,
          status: "error",
          detail,
          suspectedTable: summary.table,
          needsSchemaStrategy: summary.needsSchemaStrategy,
        });
        continue;
      }

      results.push({
        module: check.module,
        status: "ok",
        detail: "ok",
        needsSchemaStrategy: false,
      });
    } catch (error) {
      const summary = summarizeError(error);
      results.push({
        module: check.module,
        status: "error",
        detail: summary.message,
        suspectedTable: summary.table,
        needsSchemaStrategy: summary.needsSchemaStrategy,
      });
    }
  }

  const failures = results.filter(item => item.status === "error");
  const schemaFailures = failures.filter(item => item.needsSchemaStrategy);

  console.log("\n[smoke] Module results:");
  for (const result of results) {
    const base = `${result.status.toUpperCase()} ${result.module}`;
    if (result.status === "ok") {
      console.log(`- ${base}`);
      continue;
    }

    const tableHint = result.suspectedTable
      ? ` | suspected_table=${result.suspectedTable}`
      : "";
    console.log(`- ${base}${tableHint}`);
    console.log(`  ${result.detail}`);
  }

  console.log("\n[smoke] Summary:");
  console.log(`- total_checks=${results.length}`);
  console.log(`- failures=${failures.length}`);
  console.log(`- schema_related_failures=${schemaFailures.length}`);

  if (schemaFailures.length > 0) {
    console.log(
      "- recommendation=Apply/extend DB schema bootstrap strategy for affected modules"
    );
    process.exitCode = 2;
    return;
  }

  if (failures.length > 0) {
    console.log(
      "- recommendation=Investigate non-schema runtime/network/auth errors"
    );
    process.exitCode = 1;
    return;
  }

  console.log("- recommendation=No additional schema strategy needed");
}

run().catch(error => {
  console.error(
    "[smoke] Fatal:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
