import { useState, useEffect } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  X,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { StockTrendChart } from "@/components/StockTrendChart";
import { SpaceManager } from "@/components/SpaceManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Consumables() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ search: "", category: "" });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStartDate, setWeekStartDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingStockCell, setEditingStockCell] = useState<number | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<number>(0);
  const [editingPurchasedCell, setEditingPurchasedCell] = useState<number | null>(
    null
  );
  const [editingPurchasedValue, setEditingPurchasedValue] = useState<number>(0);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [selectedConsumableForAudit, setSelectedConsumableForAudit] = useState<
    number | null
  >(null);
  const [showTrendChart, setShowTrendChart] = useState(false);
  const [selectedConsumableForChart, setSelectedConsumableForChart] =
    useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit: "",
    minStock: 0,
    maxStock: 0,
    currentStock: 0,
    replenishStock: 0,
  });

  // Calculate week start date (Monday)
  useEffect(() => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    setWeekStartDate(monday);
  }, [selectedDate]);

  // Queries
  const {
    data: spaces = [],
    isLoading: spacesLoading,
    refetch: refetchSpaces,
  } = trpc.consumableSpaces.list.useQuery();
  // Converter weekStartDate para string YYYY-MM-DD usando data local (não UTC)
  const weekStartDateStr =
    weekStartDate.getFullYear() +
    "-" +
    String(weekStartDate.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(weekStartDate.getDate()).padStart(2, "0");

  const {
    data: consumables = [],
    isLoading,
    refetch,
  } = trpc.consumablesWithSpace.listWithWeeklyData.useQuery(
    {
      spaceId: selectedSpace || undefined,
      weekStartDate: weekStartDateStr as any,
      month: selectedDate.getMonth() + 1,
      year: selectedDate.getFullYear(),
      ...filters,
    },
    {
      enabled: !!selectedSpace,
    }
  );

  // Query para histórico de alterações
  const { data: auditLog = [], isLoading: auditLoading } =
    trpc.consumableStockAuditLog.list.useQuery(
      {
        spaceId: selectedSpace || undefined,
        consumableId: selectedConsumableForAudit || undefined,
        weekStartDate: weekStartDate,
      },
      { enabled: !!selectedSpace && showAuditLog }
    );

  // Query para histórico de estoque (gráfico de tendência)
  const { data: stockHistory = [], isLoading: historyLoading } =
    trpc.consumableWeeklyMovements.getHistory.useQuery(
      {
        consumableId: selectedConsumableForChart?.id || 0,
        spaceId: selectedSpace || 0,
        weeks: 12,
      },
      { enabled: !!selectedConsumableForChart && !!selectedSpace }
    );

  // Query para análise de padrões
  const { data: stockAnalysis } =
    trpc.consumableWeeklyMovements.getAnalysis.useQuery(
      {
        consumableId: selectedConsumableForChart?.id || 0,
        spaceId: selectedSpace || 0,
        weeks: 12,
      },
      { enabled: !!selectedConsumableForChart && !!selectedSpace }
    );

  // Mutation para atualizar estoque semanal
  const utils = trpc.useUtils();
  const updateWeeklyStockMutation =
    trpc.consumablesWithSpace.updateWeeklyStock.useMutation({
      onSuccess: () => {
        toast.success("Salvo!");
        // Invalidar cache e forçar atualização
        utils.consumablesWithSpace.listWithWeeklyData.invalidate();
      },
      onError: error => {
        toast.error(error.message);
      },
    });

  const updateMonthlyPurchasedMutation =
    trpc.consumablesWithSpace.updateMonthlyPurchased.useMutation({
      onSuccess: () => {
        toast.success("Comprados no mês atualizado!");
        utils.consumablesWithSpace.listWithWeeklyData.invalidate();
      },
      onError: error => {
        toast.error(error.message);
      },
    });

  // Reset editing state on mutation
  const handleUpdateStock = async (consumableId: number, newStock: number) => {
    if (!selectedSpace) return;

    const weekStartDateStr =
      weekStartDate.getFullYear() +
      "-" +
      String(weekStartDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(weekStartDate.getDate()).padStart(2, "0");

    updateWeeklyStockMutation.mutate({
      consumableId,
      spaceId: selectedSpace,
      weekStartDate: weekStartDateStr as any,
      currentStock: newStock,
    });

    setEditingStockCell(null);
  };

  const handleUpdateMonthlyPurchased = async (input: {
    consumableId: number;
    purchasedAmount: number;
  }) => {
    if (!selectedSpace) return;

    updateMonthlyPurchasedMutation.mutate({
      consumableId: input.consumableId,
      spaceId: selectedSpace,
      month: selectedDate.getMonth() + 1,
      year: selectedDate.getFullYear(),
      purchasedAmount: input.purchasedAmount,
    });

    setEditingPurchasedCell(null);
  };

  // Mutations for Consumables
  const createMutation = trpc.consumablesWithSpace.create.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      setTimeout(() => refetch(), 300);
      setIsOpen(false);
      resetForm();
    },
    onError: error => toast.error(error.message),
  });

  const updateMutation = trpc.consumablesWithSpace.update.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      setTimeout(() => refetch(), 300);
      setIsOpen(false);
      resetForm();
    },
    onError: error => toast.error(error.message),
  });

  const deleteMutation = trpc.consumablesWithSpace.delete.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetch();
    },
    onError: error => toast.error(error.message),
  });

  // Mutations for Spaces
  const createSpaceMutation = trpc.consumableSpaces.create.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetchSpaces();
    },
    onError: error => toast.error(error.message),
  });

  const updateSpaceMutation = trpc.consumableSpaces.update.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetchSpaces();
    },
    onError: error => toast.error(error.message),
  });

  const deleteSpaceMutation = trpc.consumableSpaces.delete.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetchSpaces();
      if (selectedSpace) setSelectedSpace(null);
    },
    onError: error => toast.error(error.message),
  });

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpace) {
      toast.error("Selecione uma unidade");
      return;
    }

    const payload = {
      ...formData,
      spaceId: selectedSpace,
      replenishStock: formData.maxStock - formData.currentStock,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (consumable: any) => {
    setEditingId(consumable.id);
    setFormData({
      name: consumable.name,
      category: consumable.category,
      unit: consumable.unit,
      minStock: consumable.minStock,
      maxStock: consumable.maxStock,
      currentStock: consumable.currentStock,
      replenishStock: consumable.replenishStock,
    });
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja deletar este consumível?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleShowTrendChart = (consumable: any) => {
    setSelectedConsumableForChart(consumable);
    setShowTrendChart(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      category: "",
      unit: "",
      minStock: 0,
      maxStock: 0,
      currentStock: 0,
      replenishStock: 0,
    });
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const exportReportExcelMutation =
    trpc.consumableWeeklyMovements.exportReportExcel.useMutation();
  const exportReportPDFMutation =
    trpc.consumableWeeklyMovements.exportReportPDF.useMutation();

  const handleExportExcel = () => {
    if (!selectedSpace) {
      toast.error("Selecione uma unidade primeiro");
      return;
    }

    const weekStartDateStr =
      weekStartDate.getFullYear() +
      "-" +
      String(weekStartDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(weekStartDate.getDate()).padStart(2, "0");

    exportReportExcelMutation.mutate(
      {
        spaceId: selectedSpace,
        weekStartDate: weekStartDateStr,
      },
      {
        onSuccess: (result: any) => {
          if (result.success && result.excelPath) {
            const link = document.createElement("a");
            link.href = `/api/download-excel?path=${encodeURIComponent(result.excelPath)}`;
            link.download = `relatorio_consumo_${weekStartDateStr}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Relatório exportado com sucesso!");
          }
        },
        onError: (error: any) => {
          console.error("Erro ao exportar Excel:", error);
          toast.error("Erro ao exportar relatório Excel");
        },
      }
    );
  };

  const handleExportPDF = () => {
    if (!selectedSpace) {
      toast.error("Selecione uma unidade primeiro");
      return;
    }

    const weekStartDateStr =
      weekStartDate.getFullYear() +
      "-" +
      String(weekStartDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(weekStartDate.getDate()).padStart(2, "0");

    exportReportPDFMutation.mutate(
      {
        spaceId: selectedSpace,
        weekStartDate: weekStartDateStr,
      },
      {
        onSuccess: (result: any) => {
          if (result.success && result.pdfPath) {
            const link = document.createElement("a");
            link.href = `/api/download-pdf?path=${encodeURIComponent(result.pdfPath)}`;
            link.download = `relatorio_consumo_${weekStartDateStr}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Relatório PDF exportado com sucesso!");
          }
        },
        onError: (error: any) => {
          console.error("Erro ao exportar PDF:", error);
          toast.error("Erro ao exportar relatório PDF");
        },
      }
    );
  };

  const formatWeekRange = () => {
    const start = new Date(weekStartDate);
    const end = new Date(weekStartDate);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString("pt-BR")} - ${end.toLocaleDateString("pt-BR")}`;
  };

  const getStockStatus = (current: number, min: number, max: number) => {
    if (current < min) {
      return {
        label: "Repor Estoque",
        color: "bg-red-600",
        icon: AlertTriangle,
      };
    } else if (current > max) {
      return {
        label: "Acima do Estoque",
        color: "bg-yellow-600",
        icon: AlertCircle,
      };
    } else {
      return { label: "Estoque OK", color: "bg-green-600", icon: CheckCircle };
    }
  };

  if (!selectedSpace) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Estoque de Consumíveis
          </h1>
          <p className="text-gray-400 mt-2">
            Gestão de consumíveis por unidade com histórico semanal
          </p>
        </div>
        <SpaceManager
          spaces={spaces}
          selectedSpace={selectedSpace}
          onSelectSpace={setSelectedSpace}
          onCreateSpace={data => createSpaceMutation.mutate(data)}
          onUpdateSpace={(id, data) =>
            updateSpaceMutation.mutate({ id, ...data })
          }
          onDeleteSpace={id => deleteSpaceMutation.mutate(id)}
          isLoading={spacesLoading}
          headerTitle="Selecione uma Unidade"
          headerDescription="Escolha uma unidade para gerenciar consumíveis"
          buttonLabel="Nova Unidade"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Consumíveis da Unidade
          </h1>
          <p className="text-gray-400 mt-2">Semana de {formatWeekRange()}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={!selectedSpace || consumables.length === 0}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-slate-800 border-slate-700"
            >
              <DropdownMenuItem
                onClick={handleExportExcel}
                className="text-gray-300 hover:bg-slate-700 cursor-pointer"
              >
                📊 Exportar em Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportPDF}
                className="text-gray-300 hover:bg-slate-700 cursor-pointer"
              >
                📄 Exportar em PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => setSelectedSpace(null)}
            variant="outline"
            className="w-full border-slate-600 text-gray-300 hover:bg-slate-800 sm:w-auto"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Trocar Unidade
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-sky-600 hover:bg-sky-700 text-white sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Novo Consumível
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingId ? "Editar" : "Novo"} Consumível
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Preencha os dados do consumível para salvar nesta unidade.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Nome
                  </label>
                  <Input
                    value={formData.name}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Categoria
                  </label>
                  <Input
                    value={formData.category}
                    onChange={e =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Unidade
                  </label>
                  <Input
                    value={formData.unit}
                    onChange={e =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      Est. Mínimo
                    </label>
                    <Input
                      type="number"
                      value={formData.minStock}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          minStock: parseInt(e.target.value) || 0,
                        })
                      }
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      Est. Máximo
                    </label>
                    <Input
                      type="number"
                      value={formData.maxStock}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          maxStock: parseInt(e.target.value) || 0,
                        })
                      }
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Est. Atual
                  </label>
                  <Input
                    type="number"
                    value={formData.currentStock}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        currentStock: parseInt(e.target.value) || 0,
                      })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-700"
                >
                  {editingId ? "Atualizar" : "Criar"} Consumível
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Week Selector */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePreviousWeek}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-300" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm text-gray-400">Semana de</p>
              <p className="text-lg font-semibold text-white">
                {formatWeekRange()}
              </p>
            </div>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Calendar className="h-5 w-5 text-gray-300" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </button>
          </div>

          {showCalendar && (
            <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={date => {
                  if (date) setSelectedDate(date);
                  setShowCalendar(false);
                }}
                className="w-full [&_.rdp-cell]:text-white [&_.rdp-button]:text-white [&_.rdp-button_today]:bg-sky-600 [&_.rdp-button_selected]:bg-sky-600 [&_.rdp-button_selected]:text-white"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consumables Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-white">Consumíveis</CardTitle>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Input
                placeholder="Buscar..."
                value={filters.search}
                onChange={e =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full bg-slate-700 border-slate-600 text-white sm:w-48"
              />
              <Input
                placeholder="Categoria..."
                value={filters.category}
                onChange={e =>
                  setFilters({ ...filters, category: e.target.value })
                }
                className="w-full bg-slate-700 border-slate-600 text-white sm:w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Carregando...</div>
          ) : consumables.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              Nenhum consumível encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-300">Produto</TableHead>
                    <TableHead className="text-gray-300">Categoria</TableHead>
                    <TableHead className="text-gray-300">Und.</TableHead>
                    <TableHead className="text-gray-300">Est. Mínimo</TableHead>
                    <TableHead className="text-gray-300">Est. Máximo</TableHead>
                    <TableHead className="text-gray-300">Est. Atual</TableHead>
                    <TableHead className="text-gray-300">
                      Comprados no mês
                    </TableHead>
                    <TableHead className="text-gray-300">Repor</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumables.map((consumable: any) => {
                    const status = getStockStatus(
                      consumable.currentStock,
                      consumable.minStock,
                      consumable.maxStock
                    );
                    const StatusIcon = status.icon;
                    const replenishStock =
                      consumable.maxStock - consumable.currentStock;

                    return (
                      <TableRow
                        key={consumable.id}
                        className="border-slate-700 hover:bg-slate-700/50"
                      >
                        <TableCell className="text-white font-medium">
                          {consumable.name}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {consumable.category}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {consumable.unit}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {consumable.minStock}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {consumable.maxStock}
                        </TableCell>
                        <TableCell>
                          {editingStockCell === consumable.id ? (
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={editingStockValue}
                                onChange={e =>
                                  setEditingStockValue(
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() =>
                                  handleUpdateStock(
                                    consumable.id,
                                    editingStockValue
                                  )
                                }
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingStockCell(null)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingStockCell(consumable.id);
                                setEditingStockValue(consumable.currentStock);
                              }}
                              className="text-green-400 font-semibold hover:text-green-300 cursor-pointer"
                            >
                              {consumable.currentStock}
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingPurchasedCell === consumable.id ? (
                            <div className="flex gap-1">
                              <input
                                type="number"
                                min={0}
                                value={editingPurchasedValue}
                                onChange={e =>
                                  setEditingPurchasedValue(
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() =>
                                  handleUpdateMonthlyPurchased({
                                    consumableId: consumable.id,
                                    purchasedAmount: editingPurchasedValue,
                                  })
                                }
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingPurchasedCell(null)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPurchasedCell(consumable.id);
                                setEditingPurchasedValue(
                                  Number(consumable.monthlyPurchased || 0)
                                );
                              }}
                              className="text-sky-400 font-semibold hover:text-sky-300 cursor-pointer"
                            >
                              {Number(consumable.monthlyPurchased || 0)}
                            </button>
                          )}
                        </TableCell>
                        <TableCell
                          className={
                            replenishStock > 0
                              ? "text-sky-400"
                              : "text-green-400"
                          }
                        >
                          {replenishStock > 0 ? replenishStock : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              className={`h-4 w-4 ${status.color.replace("bg-", "text-")}`}
                            />
                            <span className="text-sm text-gray-300">
                              {status.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleShowTrendChart(consumable)}
                              className="p-1 hover:bg-blue-600/30 rounded transition-colors"
                              title="Ver gráfico de tendência"
                            >
                              <svg
                                className="h-4 w-4 text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEdit(consumable)}
                              className="p-1 hover:bg-slate-600 rounded transition-colors"
                            >
                              <Edit2 className="h-4 w-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(consumable.id)}
                              className="p-1 hover:bg-red-600/30 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Gráfico de Tendência */}
      {showTrendChart && selectedConsumableForChart && (
        <Dialog open={showTrendChart} onOpenChange={setShowTrendChart}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Histórico de Estoque - {selectedConsumableForChart.name}
              </DialogTitle>
              <DialogDescription>
                Análise de tendência de consumo semanal
              </DialogDescription>
            </DialogHeader>
            <div className="w-full">
              <StockTrendChart
                data={stockHistory}
                analysis={stockAnalysis}
                consumableName={selectedConsumableForChart.name}
                isLoading={historyLoading}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
