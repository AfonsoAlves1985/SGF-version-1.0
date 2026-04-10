import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LoaderCircle, MessageSquareText, RotateCcw, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

type AssistantSidebarProps = {
  currentPath: string;
};

type AssistantResponse = {
  answer: string;
  confidence: "alta" | "media" | "baixa";
  module: string;
  researchDepth?: "inicial" | "media" | "profunda";
  highlights?: string[];
  sections?: Array<{
    title: string;
    lines: string[];
  }>;
  followUps?: string[];
  actions?: Array<{
    type: string;
    label: string;
    path?: string;
    filters?: Record<string, unknown>;
  }>;
  results?: {
    resultItems?: Array<{
      module: string;
      unidade?: string | null;
      informacao: string;
      path?: string | null;
      titulo?: string | null;
    }>;
    purchaseRequests?: Array<{
      id: number;
      documentNumber: string;
      status: string;
      company: string;
    }>;
    inventoryAssets?: Array<{
      id: number;
      nrBem: string;
      descricao: string;
      responsavel?: string | null;
    }>;
    maintenanceRequests?: Array<{
      id: number;
      title: string;
      status: string;
      priority: string;
    }>;
    rooms?: Array<{
      id: number;
      name: string;
      status: string;
      type: string;
    }>;
    suppliers?: Array<{
      id: number;
      companyName: string;
      status: string;
      spaceName?: string;
    }>;
    consumables?: Array<{
      id: number;
      name: string;
      category: string;
      status: string;
    }>;
    users?: Array<{
      id: number;
      name: string;
      role: string;
      isActive: boolean;
    }>;
    auditLogs?: Array<{
      id: number;
      module: string;
      action: string;
      userName?: string;
    }>;
    metrics?: Record<string, number>;
  };
};

const PURCHASE_FILTER_EVENT = "assistant:purchase-filters";
const PURCHASE_FILTER_STORAGE_KEY = "assistant:purchase-filters";
const ASSISTANT_MEMORY_KEY = "assistant:memory:v1";
const ASSISTANT_NAME = "Mr. Thinkker";
const QUICK_PROMPTS = [
  "Quais solicitações estão no financeiro há mais de 3 dias?",
  "Mostre itens de inventário sem responsável",
  "Há chamados urgentes de manutenção?",
];

const moduleByPath: Record<string, string> = {
  "/purchase-requests": "compras",
  "/inventory": "inventario",
  "/maintenance": "manutencao",
  "/rooms": "salas",
  "/suppliers": "fornecedores",
};

export default function AssistantSidebar({ currentPath }: AssistantSidebarProps) {
  const [location, setLocation] = useLocation();
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<
    Array<{ role: "user" | "assistant"; content: string; payload?: AssistantResponse }>
  >([]);

  const askMutation = trpc.assistant.ask.useMutation();

  const loadMemory = () => {
    try {
      const raw = localStorage.getItem(ASSISTANT_MEMORY_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as {
        preferredModule?: string;
        frequentTerms?: string[];
      };
    } catch {
      return null;
    }
  };

  const persistMemory = (next: {
    preferredModule?: string;
    frequentTerms?: string[];
  }) => {
    localStorage.setItem(ASSISTANT_MEMORY_KEY, JSON.stringify(next));
  };

  const moduleHint = useMemo(() => {
    return moduleByPath[currentPath] || "geral";
  }, [currentPath]);

  const submitQuestion = async () => {
    await submitQuestionWithText(question);
  };

  const submitPrompt = async (prompt: string) => {
    if (askMutation.isPending) return;
    await submitQuestionWithText(prompt);
  };

  const submitQuestionWithText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || askMutation.isPending) return;

    setConversation(prev => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");

    const historyPayload = conversation.slice(-10).map(item => ({
      role: item.role,
      content: item.content,
    }));

    const memory = loadMemory();

    try {
      const response = (await askMutation.mutateAsync({
        question: trimmed,
        history: [...historyPayload, { role: "user", content: trimmed }],
        context: {
          path: currentPath,
          module: moduleHint,
          memory: memory || undefined,
        },
      })) as AssistantResponse;

      const terms = trimmed
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(token => token.length >= 4)
        .slice(0, 5);

      persistMemory({
        preferredModule: response.module !== "geral" ? response.module : memory?.preferredModule,
        frequentTerms: Array.from(new Set([...(memory?.frequentTerms || []), ...terms])).slice(
          -20
        ),
      });

      setConversation(prev => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
          payload: response,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao consultar assistente";
      setConversation(prev => [
        ...prev,
        {
          role: "assistant",
          content: message,
        },
      ]);
    }
  };

  const runAction = (action: NonNullable<AssistantResponse["actions"]>[number]) => {
    if (action.type === "navigate" && action.path) {
      setLocation(action.path);
      return;
    }

    if (action.type === "apply_purchase_filters" && action.filters) {
      localStorage.setItem(PURCHASE_FILTER_STORAGE_KEY, JSON.stringify(action.filters));
      window.dispatchEvent(
        new CustomEvent(PURCHASE_FILTER_EVENT, {
          detail: action.filters,
        })
      );

      setConversation(prev => [
        ...prev,
        {
          role: "assistant",
          content:
            location === "/purchase-requests"
              ? "Filtro aplicado na tela atual de Solicitação de Compras."
              : "Filtro salvo com sucesso. Quando você abrir Solicitação de Compras, o filtro será aplicado automaticamente.",
        },
      ]);
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <Sheet>
        <SheetTrigger asChild>
          <Button className="shadow-lg gap-2 rounded-full px-4">
            <Sparkles className="h-4 w-4" />
            {ASSISTANT_NAME}
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[95vw] sm:w-[520px] bg-slate-900 border-slate-700 p-0 flex flex-col"
        >
          <SheetHeader className="px-5 py-4 border-b border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="text-white flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" />
                {ASSISTANT_NAME}
              </SheetTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-200 hover:bg-slate-700"
                onClick={() => setConversation([])}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
            </div>
            <SheetDescription className="text-slate-300">
              Pergunte em linguagem natural para consultar dados e aplicar atalhos por módulo.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {conversation.length === 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-sm text-slate-300">
                Exemplo: "Quais solicitações estão no financeiro há mais de 3 dias?"
              </div>
            )}

            {conversation.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map(prompt => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-200 hover:bg-slate-700"
                    onClick={() => void submitPrompt(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            )}

            {conversation.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-blue-600/20 border border-blue-600/40 text-blue-100"
                    : "bg-slate-800 border border-slate-700 text-slate-100"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

                {message.role === "assistant" && message.payload?.confidence ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded px-2 py-0.5 text-[11px] bg-slate-700 text-slate-200">
                      confiança: {message.payload.confidence}
                    </span>
                    {message.payload.researchDepth ? (
                      <span className="rounded px-2 py-0.5 text-[11px] bg-sky-800/60 text-sky-100">
                        análise: {message.payload.researchDepth}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.highlights?.length ? (
                  <div className="mt-3 space-y-2">
                    {message.payload.highlights.slice(0, 6).map(item => (
                      <div
                        key={item}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.sections?.length ? (
                  <div className="mt-3 space-y-2">
                    {message.payload.sections.slice(0, 4).map(section => (
                      <div
                        key={section.title}
                        className="rounded-md border border-slate-700 p-2 text-xs text-slate-200"
                      >
                        <p className="font-medium mb-1">{section.title}</p>
                        <div className="space-y-1">
                          {section.lines.slice(0, 5).map(line => (
                            <p key={`${section.title}-${line}`}>{line}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.results?.resultItems?.length ? (
                  <div className="mt-3 space-y-2">
                    {message.payload.results.resultItems.slice(0, 8).map((item, idx) => (
                      <div
                        key={`${item.module}-${item.titulo || item.informacao}-${idx}`}
                        className="rounded-md border border-slate-700 p-2 text-xs text-slate-200"
                      >
                        <div className="flex flex-wrap gap-2 mb-1">
                          <span className="rounded bg-slate-700 px-1.5 py-0.5">{item.module}</span>
                          {item.unidade ? (
                            <span className="rounded bg-sky-900/40 px-1.5 py-0.5">
                              unidade: {item.unidade}
                            </span>
                          ) : null}
                        </div>
                        <p>{item.informacao}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.actions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.payload.actions.slice(0, 3).map(action => (
                      <Button
                        key={`${action.type}-${action.label}`}
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-200 hover:bg-slate-700"
                        onClick={() => runAction(action)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.followUps?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.payload.followUps.slice(0, 3).map(prompt => (
                      <Button
                        key={prompt}
                        size="sm"
                        variant="outline"
                        className="border-sky-700/60 text-sky-100 hover:bg-sky-900/40"
                        onClick={() => void submitPrompt(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.results?.purchaseRequests?.length ? (
                  <div className="mt-3 space-y-2">
                    {message.payload.results.purchaseRequests.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200"
                      >
                        <span className="font-medium">{item.documentNumber}</span> - {item.status} - {" "}
                        {item.company}
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.results?.inventoryAssets?.length ? (
                  <div className="mt-3 space-y-2">
                    {message.payload.results.inventoryAssets.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200"
                      >
                        <span className="font-medium">{item.nrBem}</span> - {item.descricao}
                        {item.responsavel ? ` - ${item.responsavel}` : ""}
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.results?.maintenanceRequests?.length ? (
                  <div className="mt-3 space-y-2">
                    {message.payload.results.maintenanceRequests.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200"
                      >
                        <span className="font-medium">#{item.id}</span> - {item.priority} - {item.title}
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.results?.rooms?.length ? (
                  <div className="mt-3 space-y-2">
                    {message.payload.results.rooms.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200"
                      >
                        <span className="font-medium">{item.name}</span> - {item.status} - {item.type}
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.results?.suppliers?.length ? (
                  <div className="mt-3 space-y-2">
                    {message.payload.results.suppliers.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200"
                      >
                        <span className="font-medium">{item.companyName}</span> - {item.status}
                        {item.spaceName ? ` - ${item.spaceName}` : ""}
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.results?.consumables?.length ? (
                  <div className="mt-3 space-y-2">
                    {message.payload.results.consumables.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200"
                      >
                        <span className="font-medium">{item.name}</span> - {item.category} - {item.status}
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.results?.users?.length ? (
                  <div className="mt-3 space-y-2">
                    {message.payload.results.users.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200"
                      >
                        <span className="font-medium">{item.name}</span> - {item.role} - {item.isActive ? "ativo" : "inativo"}
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.role === "assistant" && message.payload?.results?.auditLogs?.length ? (
                  <div className="mt-3 space-y-2">
                    {message.payload.results.auditLogs.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200"
                      >
                        <span className="font-medium">{item.module}</span> - {item.action}
                        {item.userName ? ` - ${item.userName}` : ""}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700 p-4">
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={event => setQuestion(event.target.value)}
                placeholder="Pergunte algo sobre esta tela"
                className="bg-slate-800 border-slate-600 text-white"
                onKeyDown={event => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void submitQuestion();
                  }
                }}
              />
              <Button onClick={() => void submitQuestion()} disabled={askMutation.isPending}>
                {askMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  "Enviar"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
