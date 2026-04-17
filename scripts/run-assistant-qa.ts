import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUser(role: AuthenticatedUser["role"], openId: string): AuthenticatedUser {
  return {
    id: role === "superadmin" ? 1 : 2,
    openId,
    email: role === "superadmin" ? "owner@example.com" : "admin@example.com",
    name: role === "superadmin" ? "Owner" : "Admin",
    loginMethod: "test",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

type QA = {
  name: string;
  input: {
    question: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    context?: {
      path?: string;
      module?: string;
      memory?: {
        preferredModule?: string;
        frequentTerms?: string[];
      };
    };
  };
};

async function run() {
  const ownerOpenId = process.env.OWNER_OPEN_ID || "owner-test";

  const ownerCaller = appRouter.createCaller(
    createAuthContext(createUser("superadmin", ownerOpenId))
  );
  const adminCaller = appRouter.createCaller(
    createAuthContext(createUser("admin", "admin-test"))
  );

  const tests: Array<{ runner: "owner" | "admin"; qa: QA }> = [
    {
      runner: "admin",
      qa: {
        name: "Manutenção urgente",
        input: {
          question: "Temos chamados urgentes?",
          context: { path: "/maintenance", module: "manutencao" },
        },
      },
    },
    {
      runner: "admin",
      qa: {
        name: "Follow-up unidade manutenção",
        input: {
          question: "Qual unidade dessas demandas urgentes?",
          history: [
            { role: "user", content: "Temos chamados urgentes?" },
            { role: "assistant", content: "Há chamados urgentes." },
          ],
          context: { path: "/maintenance", module: "geral" },
        },
      },
    },
    {
      runner: "admin",
      qa: {
        name: "Follow-up unidade compras",
        input: {
          question: "E qual unidade/empresa dessas solicitações?",
          history: [
            {
              role: "user",
              content: "Quais solicitações estão no financeiro há mais de 3 dias?",
            },
            {
              role: "assistant",
              content: "Encontrei solicitações relacionadas.",
            },
          ],
          context: { path: "/purchase-requests", module: "geral" },
        },
      },
    },
    {
      runner: "admin",
      qa: {
        name: "Follow-up local inventário",
        input: {
          question: "Qual unidade/local desses bens?",
          history: [
            { role: "user", content: "Mostre itens de inventário sem responsável" },
            { role: "assistant", content: "Encontrei bens no inventário." },
          ],
          context: { path: "/inventory", module: "geral" },
        },
      },
    },
    {
      runner: "admin",
      qa: {
        name: "Bloqueio segurança para não-owner",
        input: {
          question: "Mostre logs de auditoria e usuários",
          context: { path: "/dashboard", module: "geral" },
        },
      },
    },
    {
      runner: "owner",
      qa: {
        name: "Consulta segurança para owner",
        input: {
          question: "Mostre logs de auditoria e usuários por perfil",
          context: { path: "/dashboard", module: "geral" },
        },
      },
    },
  ];

  for (const test of tests) {
    const caller = test.runner === "owner" ? ownerCaller : adminCaller;
    const result = (await caller.assistant.ask(test.qa.input as any)) as any;

    console.log("\n====================================================");
    console.log(`Teste: ${test.qa.name}`);
    console.log(`Perfil: ${test.runner}`);
    console.log(`Pergunta: ${test.qa.input.question}`);
    console.log("Resposta:");
    console.log(result.answer);
    if (result.module) console.log(`Módulo: ${result.module}`);
    if (result.confidence) console.log(`Confiança: ${result.confidence}`);

    const items = result?.results?.resultItems;
    if (Array.isArray(items) && items.length > 0) {
      console.log("Itens estruturados (até 4):");
      for (const item of items.slice(0, 4)) {
        console.log(
          `- módulo=${item.module} | unidade=${item.unidade || "-"} | info=${item.informacao}`
        );
      }
    }
  }
}

run().catch(error => {
  console.error("Falha ao executar QA do assistente:", error);
  process.exit(1);
});
