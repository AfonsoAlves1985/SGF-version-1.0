import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { EditableCell } from "@/components/EditableCell";

interface MonthlyMovementsTableProps {
  consumableId: number;
  spaceId: number;
  consumableName: string;
}

const WEEKS = [
  { key: "week1Stock", label: "Semana 1" },
  { key: "week2Stock", label: "Semana 2" },
  { key: "week3Stock", label: "Semana 3" },
  { key: "week4Stock", label: "Semana 4" },
  { key: "week5Stock", label: "Semana 5" },
];

export function MonthlyMovementsTable({ consumableId, spaceId, consumableName }: MonthlyMovementsTableProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    monthStartDate: new Date().toISOString().split("T")[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    week1Stock: 0,
    week2Stock: 0,
    week3Stock: 0,
    week4Stock: 0,
    week5Stock: 0,
    totalMovement: 0,
    averageStock: 0,
  });

  const { data: movements = [], isLoading, refetch } = trpc.consumableMonthlyMovements.list.useQuery({
    consumableId,
    spaceId,
  });

  const createMutation = trpc.consumableMonthlyMovements.create.useMutation({
    onSuccess: () => {
      toast.success("Movimentação mensal criada!");
      refetch();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.consumableMonthlyMovements.update.useMutation({
    onSuccess: () => {
      toast.success("Movimentação mensal atualizada!");
      refetch();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.consumableMonthlyMovements.delete.useMutation({
    onSuccess: () => {
      toast.success("Movimentação mensal removida!");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      monthStartDate: new Date().toISOString().split("T")[0],
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      week1Stock: 0,
      week2Stock: 0,
      week3Stock: 0,
      week4Stock: 0,
      week5Stock: 0,
      totalMovement: 0,
      averageStock: 0,
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    const totalMovement = WEEKS.reduce((sum, week) => sum + (formData[week.key as keyof typeof formData] as number || 0), 0);
    const averageStock = Math.round(totalMovement / WEEKS.length);
    
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
        totalMovement,
        averageStock,
      });
    } else {
      createMutation.mutate({
        consumableId,
        spaceId,
        ...formData,
        totalMovement,
        averageStock,
      } as any);
    }
  };

  const handleEdit = (movement: any) => {
    setFormData(movement);
    setEditingId(movement.id);
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta movimentação?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleWeekChange = (week: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      [week]: value,
    }));
  };

  const getMonthName = (month: number) => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return months[month - 1];
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Movimentações Mensais - {consumableName}</CardTitle>
          <CardDescription>Agregação semanal para análise mensal de consumo</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Mês
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Nova"} Movimentação Mensal</DialogTitle>
              <DialogDescription>Registre o estoque agregado para cada semana do mês</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Data de Início</label>
                  <Input
                    type="date"
                    value={formData.monthStartDate}
                    onChange={(e) => setFormData({ ...formData, monthStartDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Mês</label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Ano</label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {WEEKS.map((week) => (
                  <div key={week.key}>
                    <label className="text-sm font-medium">{week.label}</label>
                    <Input
                      type="number"
                      value={formData[week.key as keyof typeof formData]}
                      onChange={(e) => handleWeekChange(week.key, parseInt(e.target.value) || 0)}
                    />
                  </div>
                ))}
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingId ? "Atualizar" : "Criar"} Movimentação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-gray-500">Carregando...</p>
        ) : movements.length === 0 ? (
          <p className="text-center text-gray-500">Nenhuma movimentação registrada</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês/Ano</TableHead>
                  {WEEKS.map((week) => (
                    <TableHead key={week.key} className="text-center">{week.label}</TableHead>
                  ))}
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Média</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement: any) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">
                      {getMonthName(movement.month)}/{movement.year}
                    </TableCell>
                    {WEEKS.map((week) => (
                      <TableCell key={week.key} className="text-center">
                        <EditableCell
                          value={String(movement[week.key as keyof typeof movement])}
                          onSave={(value) => {
                            updateMutation.mutate({
                              id: movement.id,
                              [week.key]: parseInt(String(value)),
                            } as any);
                          }}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold">{movement.totalMovement}</TableCell>
                    <TableCell className="text-center font-semibold">{movement.averageStock}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        movement.status === "REPOR_ESTOQUE" ? "bg-red-100 text-red-800" :
                        movement.status === "ACIMA_DO_ESTOQUE" ? "bg-orange-100 text-orange-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {movement.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(movement)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(movement.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
