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
import { EditableCell } from "@/components/EditableCell";
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
  const [editingMovementCell, setEditingMovementCell] = useState<{ consumableId: number; day: string } | null>(null);
  const [editingMovementValue, setEditingMovementValue] = useState<number>(0);
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
  const { data: consumables = [], isLoading, refetch } = trpc.consumablesWithSpace.list.useQuery(
    {
      spaceId: selectedSpace || undefined,
      ...filters,
    },
    { enabled: !!selectedSpace }
  );

  const { data: movements = [], refetch: refetchMovements } = trpc.consumableWeeklyMovements.list.useQuery(
    {
      consumableId: 0,
      spaceId: selectedSpace || 0,
    },
    { enabled: !!selectedSpace }
  );

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
      toast.success("Unidade criada com sucesso!");
      refetchSpaces();
      setIsSpaceDialogOpen(false);
      setSpaceFormData({ name: "", description: "", location: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSpaceMutation = trpc.consumableSpaces.update.useMutation({
    onSuccess: () => {
      toast.success("Unidade atualizada com sucesso!");
      refetchSpaces();
      setEditingSpaceId(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteSpaceMutation = trpc.consumableSpaces.delete.useMutation({
    onSuccess: () => {
      toast.success("Unidade deletada com sucesso!");
      refetchSpaces();
      if (selectedSpace === editingSpaceId) {
        setSelectedSpace(null);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMovementMutation = trpc.consumableWeeklyMovements.update.useMutation({
    onSuccess: () => {
      toast.success("Movimentação atualizada!");
      refetchMovements();
      setEditingMovementCell(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const createMovementMutation = trpc.consumableWeeklyMovements.create.useMutation({
    onSuccess: () => {
      toast.success("Movimentação criada!");
      refetchMovements();
      setEditingMovementCell(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      unit: "",
      minStock: 0,
      maxStock: 0,
      currentStock: 0,
      replenishStock: 0,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpace) {
      toast.error("Selecione uma unidade!");
      return;
    }

    if (editingId) {
      await updateMutation.mutateAsync({
        id: editingId,
        ...formData,
      });
    } else {
      await createMutation.mutateAsync({
        spaceId: selectedSpace || 0,
        ...formData,
      });
    }
  };

  const handleSpaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSpaceId) {
      await updateSpaceMutation.mutateAsync({
        id: editingSpaceId,
        ...spaceFormData,
      });
    } else {
      await createSpaceMutation.mutateAsync(spaceFormData);
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

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja deletar este consumível?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleSpaceDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja deletar esta unidade?")) {
      await deleteSpaceMutation.mutateAsync(id);
    }
  };

  const getStockStatus = (current: number, min: number, max: number) => {
    if (current <= min) return { label: "Repor Estoque", color: "bg-red-500", icon: AlertTriangle };
    if (current >= max) return { label: "Acima do Estoque", color: "bg-yellow-500", icon: AlertCircle };
    return { label: "Estoque OK", color: "bg-green-500", icon: CheckCircle };
  };

  const formatWeekRange = () => {
    const start = new Date(weekStartDate);
    const end = new Date(weekStartDate);
    end.setDate(end.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    };

    return `${formatDate(start)} - ${formatDate(end)}`;
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

  const getMovementForConsumable = (consumableId: number) => {
    return movements.find(
      (m: any) =>
        m.consumableId === consumableId &&
        new Date(m.weekStartDate).getFullYear() === weekStartDate.getFullYear() &&
        new Date(m.weekStartDate).getMonth() === weekStartDate.getMonth() &&
        new Date(m.weekStartDate).getDate() === weekStartDate.getDate()
    );
  };

  const handleMovementEdit = async (consumableId: number, day: string, value: number) => {
    const movement = getMovementForConsumable(consumableId);
    const weekNumber = Math.ceil(
      (weekStartDate.getDate() +
        new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), 1).getDay()) /
        7
    );

    if (movement) {
      await updateMovementMutation.mutateAsync({
        id: movement.id,
        [day]: value,
      } as any);
    } else {
      const dayValues: Record<string, number> = {
        mondayStock: 0,
        tuesdayStock: 0,
        wednesdayStock: 0,
        thursdayStock: 0,
        fridayStock: 0,
        saturdayStock: 0,
        sundayStock: 0,
      };
      dayValues[day] = value;

      await createMovementMutation.mutateAsync({
        consumableId,
        spaceId: selectedSpace || 0,
        weekStartDate: weekStartDate.toISOString().split("T")[0],
        weekNumber,
        year: weekStartDate.getFullYear(),
        totalMovement: value,
        ...dayValues,
      } as any);
    }
  };

  const DAYS_OF_WEEK = [
    { key: "mondayStock", label: "Seg" },
    { key: "tuesdayStock", label: "Ter" },
    { key: "wednesdayStock", label: "Qua" },
    { key: "thursdayStock", label: "Qui" },
    { key: "fridayStock", label: "Sex" },
    { key: "saturdayStock", label: "Sab" },
    { key: "sundayStock", label: "Dom" },
  ];

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
                <DialogTitle className="text-white">Nova Unidade</DialogTitle>
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
                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
                  Criar Unidade
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {spaces.map((space: any) => (
                <div
                  key={space.id}
                  onClick={() => setSelectedSpace(space.id)}
                  className="p-4 rounded-lg border-2 border-slate-600 hover:border-orange-600 cursor-pointer transition-colors bg-slate-700/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{space.name}</h3>
                      <p className="text-sm text-gray-400 mt-1">{space.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpaceEdit(space);
                        }}
                        className="p-1 hover:bg-slate-600 rounded"
                      >
                        <Edit2 className="h-4 w-4 text-gray-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpaceDelete(space.id);
                        }}
                        className="p-1 hover:bg-red-600/20 rounded"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Seletor de Semana */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Consumíveis da Unidade</h1>
          <p className="text-gray-400 mt-2">Gestão de consumíveis por unidade com histórico semanal</p>
        </div>
        <div className="flex gap-4">
          <Dialog open={isSpaceDialogOpen} onOpenChange={setIsSpaceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-800">
                <Building2 className="h-4 w-4 mr-2" />
                Trocar Unidade
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Selecione uma Unidade</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {spaces.map((space: any) => (
                  <button
                    key={space.id}
                    onClick={() => {
                      setSelectedSpace(space.id);
                      setIsSpaceDialogOpen(false);
                    }}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedSpace === space.id
                        ? "bg-orange-600 text-white"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    {space.name}
                  </button>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Est. Atual</label>
                    <Input
                      type="number"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300">Repor Estoque</label>
                    <Input
                      type="number"
                      value={formData.replenishStock}
                      onChange={(e) => setFormData({ ...formData, replenishStock: parseInt(e.target.value) || 0 })}
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
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
            <CardTitle className="text-white">Consumíveis da Unidade</CardTitle>
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
                    {DAYS_OF_WEEK.map((day) => (
                      <TableHead key={day.key} className="text-gray-300 text-center">
                        {day.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumables.map((consumable: any) => {
                    const status = getStockStatus(consumable.currentStock, consumable.minStock, consumable.maxStock);
                    const StatusIcon = status.icon;
                    const movement = getMovementForConsumable(consumable.id);

                    return (
                      <TableRow key={consumable.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell className="text-white font-medium">{consumable.name}</TableCell>
                        <TableCell className="text-gray-300">{consumable.category}</TableCell>
                        <TableCell className="text-gray-300">{consumable.unit}</TableCell>
                        <TableCell className="text-gray-300">{consumable.minStock}</TableCell>
                        <TableCell className="text-gray-300">{consumable.maxStock}</TableCell>
                        <TableCell className="text-green-400 font-semibold">{consumable.currentStock}</TableCell>
                        <TableCell className="text-orange-400">{consumable.replenishStock}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${status.color.replace("bg-", "text-")}`} />
                            <span className="text-sm text-gray-300">{status.label}</span>
                          </div>
                        </TableCell>
                        {DAYS_OF_WEEK.map((day) => (
                          <TableCell key={day.key} className="text-center">
                            {editingMovementCell?.consumableId === consumable.id && editingMovementCell?.day === day.key ? (
                              <input
                                type="number"
                                value={editingMovementValue}
                                onChange={(e) => setEditingMovementValue(parseInt(e.target.value) || 0)}
                                onBlur={() => {
                                  handleMovementEdit(consumable.id, day.key, editingMovementValue);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleMovementEdit(consumable.id, day.key, editingMovementValue);
                                  }
                                }}
                                autoFocus
                                className="w-12 h-8 bg-slate-700 border border-orange-600 text-white text-center rounded"
                              />
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingMovementCell({ consumableId: consumable.id, day: day.key });
                                  setEditingMovementValue(movement?.[day.key as keyof typeof movement] || 0);
                                }}
                                className="w-12 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
                              >
                                {movement?.[day.key as keyof typeof movement] || 0}
                              </button>
                            )}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(consumable)}
                              className="p-1 hover:bg-slate-600 rounded transition-colors"
                            >
                              <Edit2 className="h-4 w-4 text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(consumable.id)}
                              className="p-1 hover:bg-red-600/20 rounded transition-colors"
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
