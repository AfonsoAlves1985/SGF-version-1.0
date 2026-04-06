import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { MaintenanceInlineEdit } from "./MaintenanceInlineEdit";

interface MaintenanceRequest {
  id: number;
  title: string;
  description?: string;
  department?: string;
  requestDate?: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  type: "preventiva" | "correctiva";
  status: "aberto" | "em_progresso" | "concluido" | "cancelado";
  createdAt: string;
}

interface MaintenanceKanbanProps {
  requests: MaintenanceRequest[];
  onUpdateStatus: (id: number, newStatus: string) => void;
  onUpdateField: (id: number, field: string, value: string) => void;
  isLoading?: boolean;
}

const STATUS_COLUMNS = [
  { id: "aberto", label: "Aberto", color: "bg-yellow-900/30 border-yellow-700/50" },
  { id: "em_progresso", label: "Em Progresso", color: "bg-blue-900/30 border-blue-700/50" },
  { id: "concluido", label: "Concluído", color: "bg-green-900/30 border-green-700/50" },
  { id: "cancelado", label: "Cancelado", color: "bg-red-900/30 border-red-700/50" },
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgente":
      return "bg-red-900/50 text-red-300";
    case "alta":
      return "bg-sky-900/50 text-sky-300";
    case "media":
      return "bg-yellow-900/50 text-yellow-300";
    case "baixa":
      return "bg-green-900/50 text-green-300";
    default:
      return "bg-gray-900/50 text-gray-300";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "urgente":
      return <AlertTriangle className="w-4 h-4" />;
    case "em_progresso":
      return <Clock className="w-4 h-4" />;
    case "concluido":
      return <CheckCircle className="w-4 h-4" />;
    default:
      return null;
  }
};

export function MaintenanceKanban({
  requests,
  onUpdateStatus,
  onUpdateField,
  isLoading = false,
}: MaintenanceKanbanProps) {
  const [draggedCard, setDraggedCard] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, requestId: number) => {
    setDraggedCard(requestId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    if (draggedCard !== null) {
      const request = requests.find((r) => r.id === draggedCard);
      if (request && request.status !== statusId) {
        onUpdateStatus(draggedCard, statusId);
      }
      setDraggedCard(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map((column) => {
          const columnRequests = requests.filter((r) => r.status === column.id);

          return (
            <div
              key={column.id}
              className={`rounded-lg border-2 p-4 min-h-96 ${column.color} transition-all`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="mb-4">
                <h3 className="font-semibold text-white text-lg">{column.label}</h3>
                <p className="text-sm text-gray-400">{columnRequests.length} chamados</p>
              </div>

              <div className="space-y-3">
                {columnRequests.map((request) => (
                  <div
                    key={request.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, request.id)}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-3 cursor-move hover:shadow-lg hover:border-sky-600/50 transition-all"
                  >
                    {/* Título */}
                    <MaintenanceInlineEdit
                      value={request.title}
                      field="title"
                      onSave={(newValue) => onUpdateField(request.id, "title", newValue)}
                      isLoading={isLoading}
                    >
                      <h4 className="font-semibold text-white text-sm mb-2 cursor-pointer hover:text-sky-400">
                        {request.title}
                      </h4>
                    </MaintenanceInlineEdit>

                    {/* Tipo e Prioridade */}
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <MaintenanceInlineEdit
                        value={request.type}
                        field="type"
                        onSave={(newValue) => onUpdateField(request.id, "type", newValue)}
                        isLoading={isLoading}
                      >
                        <span className="text-xs px-2 py-1 rounded bg-blue-900/50 text-blue-300 cursor-pointer hover:bg-blue-900/70">
                          {request.type === "preventiva" ? "Preventiva" : "Corretiva"}
                        </span>
                      </MaintenanceInlineEdit>

                      <MaintenanceInlineEdit
                        value={request.priority}
                        field="priority"
                        onSave={(newValue) => onUpdateField(request.id, "priority", newValue)}
                        isLoading={isLoading}
                      >
                        <span className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 ${getPriorityColor(request.priority)}`}>
                          {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                        </span>
                      </MaintenanceInlineEdit>
                    </div>

                    {/* Descrição */}
                    {request.description && (
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">{request.description}</p>
                    )}

                    {(request.department || request.requestDate) && (
                      <div className="mb-2 space-y-1">
                        {request.department && (
                          <p className="text-xs text-gray-300">
                            Departamento: {request.department}
                          </p>
                        )}
                        {request.requestDate && (
                          <p className="text-xs text-gray-300">
                            Data do chamado: {request.requestDate}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Data */}
                    <p className="text-xs text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))}

                {columnRequests.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">Nenhum chamado</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
