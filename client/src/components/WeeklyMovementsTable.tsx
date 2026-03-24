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

interface WeeklyMovementsTableProps {
  consumableId: number;
  spaceId: number;
  consumableName: string;
}

const DAYS_OF_WEEK = [
  { key: "mondayStock", label: "Segunda" },
  { key: "tuesdayStock", label: "Terça" },
  { key: "wednesdayStock", label: "Quarta" },
  { key: "thursdayStock", label: "Quinta" },
  { key: "fridayStock", label: "Sexta" },
  { key: "saturdayStock", label: "Sábado" },
  { key: "sundayStock", label: "Domingo" },
];

export function WeeklyMovementsTable({ consumableId, spaceId, consumableName }: WeeklyMovementsTableProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    weekStartDate: new Date().toISOString().split("T")[0],
    weekNumber: Math.ceil((new Date().getDate() + new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay()) / 7),
    year: new Date().getFullYear(),
    mondayStock: 0,
    tuesdayStock: 0,
    wednesdayStock: 0,
    thursdayStock: 0,
    fridayStock: 0,
    saturdayStock: 0,
    sundayStock: 0,
    totalMovement: 0,
  });

  const { data: movements = [], isLoading, refetch } = trpc.consumableWeeklyMovements.list.useQuery({
    consumableId,
    spaceId,
  });

  const createMutation = trpc.consumableWeeklyMovements.create.useMutation({
    onSuccess: () => {
      toast.success("Movimentação semanal criada!");
      refetch();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.consumableWeeklyMovements.update.useMutation({
    onSuccess: () => {
      toast.success("Movimentação semanal atualizada!");
      refetch();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.consumableWeeklyMovements.delete.useMutation({
    onSuccess: () => {
      toast.success("Movimentação semanal removida!");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      weekStartDate: new Date().toISOString().split("T")[0],
      weekNumber: Math.ceil((new Date().getDate() + new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay()) / 7),
      year: new Date().getFullYear(),
      mondayStock: 0,
      tuesdayStock: 0,
      wednesdayStock: 0,
      thursdayStock: 0,
      fridayStock: 0,
      saturdayStock: 0,
      sundayStock: 0,
      totalMovement: 0,
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    const totalMovement = DAYS_OF_WEEK.reduce((sum, day) => sum + (formData[day.key as keyof typeof formData] as number || 0), 0);
    
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
        totalMovement,
      });
    } else {
      createMutation.mutate({
        consumableId,
        spaceId,
        ...formData,
        totalMovement,
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

  const handleDayChange = (day: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      [day]: value,
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Movimentações Semanais - {consumableName}</CardTitle>
          <CardDescription>Registre o estoque diário para acompanhar movimentações</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Semana
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Nova"} Movimentação Semanal</DialogTitle>
              <DialogDescription>Registre o estoque para cada dia da semana</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Data de Início da Semana</label>
                  <Input
                    type="date"
                    value={formData.weekStartDate}
                    onChange={(e) => setFormData({ ...formData, weekStartDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Semana do Ano</label>
                  <Input
                    type="number"
                    value={formData.weekNumber}
                    onChange={(e) => setFormData({ ...formData, weekNumber: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.key}>
                    <label className="text-sm font-medium">{day.label}</label>
                    <Input
                      type="number"
                      value={formData[day.key as keyof typeof formData]}
                      onChange={(e) => handleDayChange(day.key, parseInt(e.target.value) || 0)}
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
                  <TableHead>Semana</TableHead>
                  {DAYS_OF_WEEK.map((day) => (
                    <TableHead key={day.key} className="text-center">{day.label}</TableHead>
                  ))}
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement: any) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">
                      Sem. {movement.weekNumber}/{movement.year}
                    </TableCell>
                    {DAYS_OF_WEEK.map((day) => (
                      <TableCell key={day.key} className="text-center">
                      <EditableCell
                        value={String(movement[day.key as keyof typeof movement])}
                        onSave={(value) => {
                          updateMutation.mutate({
                            id: movement.id,
                            [day.key]: parseInt(String(value)),
                          } as any);
                        }}
                      />
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold">{movement.totalMovement}</TableCell>
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
