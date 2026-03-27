import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle, AlertTriangle, X, Building2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

export default function Consumables() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isSpaceDialogOpen, setIsSpaceDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingSpaceId, setEditingSpaceId] = useState<number | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [filters, setFilters] = useState({ search: "", category: "" });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStartDate, setWeekStartDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingStockCell, setEditingStockCell] = useState<number | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<number>(0);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [selectedConsumableForAudit, setSelectedConsumableForAudit] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit: "",
    minStock: 0,
    maxStock: 0,
    currentStock: 0,
    replenishStock: 0,
  });
  const [spaceFormData, setSpaceFormData] = useState({
    name: "",
    description: "",
    location: "",
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
  const { data: spaces = [], isLoading: spacesLoading, refetch: refetchSpaces } = trpc.consumableSpaces.list.useQuery();
  // Converter weekStartDate para string YYYY-MM-DD para garantir consistência
  const weekStartDateStr = weekStartDate.toISOString().split('T')[0];
  
  const { data: consumables = [], isLoading, refetch } = trpc.consumablesWithSpace.listWithWeeklyData.useQuery(
    {
      spaceId: selectedSpace || undefined,
      weekStartDate: weekStartDateStr as any,
      ...filters,
    },
    { enabled: !!selectedSpace }
  );

  // Query para histórico de alterações
  const { data: auditLog = [], isLoading: auditLoading } = trpc.consumableStockAuditLog.list.useQuery(
    {
      spaceId: selectedSpace || undefined,
      consumableId: selectedConsumableForAudit || undefined,
      weekStartDate: weekStartDate,
    },
    { enabled: !!selectedSpace && showAuditLog }
  );

  // Mutation para atualizar estoque semanal
  const updateWeeklyStockMutation = trpc.consumablesWithSpace.updateWeeklyStock.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // Mutations for Consumables
  const createMutation = trpc.consumablesWithSpace.create.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetch();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.consumablesWithSpace.update.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetch();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.consumablesWithSpace.delete.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // Mutations for Spaces
  const createSpaceMutation = trpc.consumableSpaces.create.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetchSpaces();
      setIsSpaceDialogOpen(false);
      setSpaceFormData({ name: "", description: "", location: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSpaceMutation = trpc.consumableSpaces.update.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetchSpaces();
      setIsSpaceDialogOpen(false);
      setEditingSpaceId(null);
      setSpaceFormData({ name: "", description: "", location: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteSpaceMutation = trpc.consumableSpaces.delete.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetchSpaces();
      if (selectedSpace === editingSpaceId) setSelectedSpace(null);
    },
    onError: (error) => toast.error(error.message),
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

  const handleSpaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSpaceId) {
      updateSpaceMutation.mutate({ id: editingSpaceId, ...spaceFormData });
    } else {
      createSpaceMutation.mutate(spaceFormData);
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

  const handleSpaceEdit = (space: any) => {
    setEditingSpaceId(space.id);
    setSpaceFormData({
      name: space.name,
      description: space.description || "",
      location: space.location || "",
    });
  };

  const handleSpaceDelete = (spaceId: number) => {
    if (window.confirm("Tem certeza que deseja deletar esta unidade?")) {
      deleteSpaceMutation.mutate(spaceId);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja deletar este consumível?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdateStock = async (consumableId: number, newStock: number) => {
    if (!selectedSpace) return;

    // Converter weekStartDate para string YYYY-MM-DD para garantir consistência
    const weekStartDateStr = weekStartDate.toISOString().split('T')[0];

    updateWeeklyStockMutation.mutate({
      consumableId,
      spaceId: selectedSpace,
      weekStartDate: weekStartDateStr as any,
      currentStock: newStock,
    });

    setEditingStockCell(null);
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

  const formatWeekRange = () => {
    const start = new Date(weekStartDate);
    const end = new Date(weekStartDate);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString("pt-BR")} - ${end.toLocaleDateString("pt-BR")}`;
  };

  const getStockStatus = (current: number, min: number, max: number) => {
    if (current < min) {
      return { label: "Repor Estoque", color: "bg-red-600", icon: AlertTriangle };
    } else if (current > max) {
      return { label: "Acima do Estoque", color: "bg-yellow-600", icon: AlertCircle };
    } else {
      return { label: "Estoque OK", color: "bg-green-600", icon: CheckCircle };
    }
  };

  if (!selectedSpace) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Estoque de Consumíveis</h1>
            <p className="text-gray-400 mt-2">Gestão de consumíveis por unidade com histórico semanal</p>
          </div>
          <Dialog open={isSpaceDialogOpen} onOpenChange={setIsSpaceDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nova Unidade
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">{editingSpaceId ? "Editar" : "Nova"} Unidade</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSpaceSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Nome</label>
                  <Input
                    value={spaceFormData.name}
                    onChange={(e) => setSpaceFormData({ ...spaceFormData, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Descrição</label>
                  <Input
                    value={spaceFormData.description}
                    onChange={(e) => setSpaceFormData({ ...spaceFormData, description: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Localização</label>
                  <Input
                    value={spaceFormData.location}
                    onChange={(e) => setSpaceFormData({ ...spaceFormData, location: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700">
                    {editingSpaceId ? "Atualizar" : "Criar"} Unidade
                  </Button>
                  {editingSpaceId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingSpaceId(null);
                        setSpaceFormData({ name: "", description: "", location: "" });
                        setIsSpaceDialogOpen(false);
                      }}
                      className="border-slate-600 text-gray-300 hover:bg-slate-800"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Selecione uma Unidade</CardTitle>
          </CardHeader>
          <CardContent>
            {spaces.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>Nenhuma unidade criada ainda.</p>
                <p className="text-sm mt-2">Clique em "Nova Unidade" para começar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spaces.map((space: any) => (
                  <div
                    key={space.id}
                    onClick={() => setSelectedSpace(space.id)}
                    className="p-4 rounded-lg border-2 border-slate-600 hover:border-orange-600 cursor-pointer transition-all duration-200 bg-slate-700/50 hover:bg-slate-700 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{space.name}</h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{space.description || "Sem descrição"}</p>
                      </div>
                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpaceEdit(space);
                            setIsSpaceDialogOpen(true);
                          }}
                          className="p-1.5 hover:bg-slate-600 rounded transition-colors"
                          title="Editar unidade"
                        >
                          <Edit2 className="h-4 w-4 text-blue-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpaceDelete(space.id);
                          }}
                          className="p-1.5 hover:bg-red-600/30 rounded transition-colors"
                          title="Deletar unidade"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Consumíveis da Unidade</h1>
          <p className="text-gray-400 mt-2">Semana de {formatWeekRange()}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSpaceDialogOpen} onOpenChange={setIsSpaceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-800">
                <Building2 className="h-4 w-4 mr-2" />
                Trocar Unidade
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Selecione uma Unidade</DialogTitle>
                <DialogDescription className="text-gray-400">Escolha uma unidade para gerenciar consumíveis</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {spaces.map((space: any) => (
                  <div key={space.id} className="flex items-center gap-2 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group">
                    <button
                      onClick={() => {
                        setSelectedSpace(space.id);
                        setIsSpaceDialogOpen(false);
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-white">{space.name}</div>
                      <div className="text-xs text-gray-400">{space.description || "Sem descrição"}</div>
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpaceEdit(space);
                          setIsSpaceDialogOpen(true);
                        }}
                        className="p-1 hover:bg-slate-600 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4 text-blue-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpaceDelete(space.id);
                        }}
                        className="p-1 hover:bg-red-600/30 rounded transition-colors"
                        title="Deletar"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Novo Consumível
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">{editingId ? "Editar" : "Novo"} Consumível</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Nome</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Categoria</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Unidade</label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Est. Mínimo</label>
                    <Input
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300">Est. Máximo</label>
                    <Input
                      type="number"
                      value={formData.maxStock}
                      onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Est. Atual</label>
                  <Input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
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
              <p className="text-lg font-semibold text-white">{formatWeekRange()}</p>
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
                onSelect={(date) => {
                  if (date) setSelectedDate(date);
                  setShowCalendar(false);
                }}
                className="w-full [&_.rdp-cell]:text-white [&_.rdp-button]:text-white [&_.rdp-button_today]:bg-orange-600 [&_.rdp-button_selected]:bg-orange-600 [&_.rdp-button_selected]:text-white"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consumables Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Consumíveis</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Buscar..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white w-48"
              />
              <Input
                placeholder="Categoria..."
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Carregando...</div>
          ) : consumables.length === 0 ? (
            <div className="text-center text-gray-400 py-8">Nenhum consumível encontrado</div>
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
                    <TableHead className="text-gray-300">Repor</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumables.map((consumable: any) => {
                    const status = getStockStatus(consumable.currentStock, consumable.minStock, consumable.maxStock);
                    const StatusIcon = status.icon;
                    const replenishStock = consumable.maxStock - consumable.currentStock;

                    return (
                      <TableRow key={consumable.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell className="text-white font-medium">{consumable.name}</TableCell>
                        <TableCell className="text-gray-300">{consumable.category}</TableCell>
                        <TableCell className="text-gray-300">{consumable.unit}</TableCell>
                        <TableCell className="text-gray-300">{consumable.minStock}</TableCell>
                        <TableCell className="text-gray-300">{consumable.maxStock}</TableCell>
                        <TableCell>
                          {editingStockCell === consumable.id ? (
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={editingStockValue}
                                onChange={(e) => setEditingStockValue(parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateStock(consumable.id, editingStockValue)}
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
                        <TableCell className={replenishStock > 0 ? "text-orange-400" : "text-green-400"}>
                          {replenishStock > 0 ? replenishStock : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${status.color.replace("bg-", "text-")}`} />
                            <span className="text-sm text-gray-300">{status.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
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
    </div>
  );
}

