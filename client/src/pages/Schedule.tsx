import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Calendar, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, addDays } from "date-fns";
import { pt } from "date-fns/locale";

export default function Schedule() {
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>();
  const [selectedShift, setSelectedShift] = useState<string>("manha");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineEditField, setInlineEditField] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");
  const [formData, setFormData] = useState({
    teamId: "",
    shift: "manha" as "manha" | "tarde" | "noite",
    date: new Date(),
    sector: "Geral",
    status: "confirmada" as "confirmada" | "pendente" | "cancelada",
  });

  const { data: schedules = [], isLoading, refetch } = trpc.schedules.list.useQuery({
    teamId: selectedTeam ? parseInt(selectedTeam) : undefined,
    date: selectedDate,
  });

  const { data: teams = [] } = trpc.teams.list.useQuery();

  const createMutation = trpc.schedules.create.useMutation({
    onSuccess: () => {
      toast.success("Escala criada com sucesso!");
      setSelectedTeam(undefined);
      setSelectedShift("manha");
      setSelectedDate(new Date());
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateMutation = trpc.schedules.update.useMutation({
    onSuccess: () => {
      toast.success("Escala actualizada com sucesso!");
      setEditingSchedule(null);
      setFormData({ teamId: "", shift: "manha", date: new Date(), sector: "Geral", status: "confirmada" });
      setIsDialogOpen(false);
      setInlineEditingId(null);
      setInlineEditField(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = trpc.schedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Escala eliminada com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreateSchedule = () => {
    if (!selectedTeam) {
      toast.error("Selecione um membro da equipa");
      return;
    }

    createMutation.mutate({
      teamId: parseInt(selectedTeam),
      date: selectedDate,
      shift: selectedShift as "manha" | "tarde" | "noite",
      sector: "Geral",
    });
  };

  const handleEditSchedule = (schedule: any) => {
    setEditingSchedule(schedule);
    setFormData({
      teamId: schedule.teamId.toString(),
      shift: schedule.shift,
      date: new Date(schedule.date),
      sector: schedule.sector,
      status: schedule.status,
    });
    setIsDialogOpen(true);
  };

  const handleInlineEdit = (schedule: any, field: string) => {
    setInlineEditingId(schedule.id);
    setInlineEditField(field);
    setInlineEditValue(String(schedule[field]));
  };

  const handleInlineSubmit = () => {
    if (inlineEditingId && inlineEditField) {
      const updateData: any = {
        id: inlineEditingId,
      };
      updateData[inlineEditField] = inlineEditValue;
      updateMutation.mutate(updateData);
    }
  };

  const handleSubmitEdit = () => {
    if (!formData.teamId || !formData.sector) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (editingSchedule) {
      const updateData: any = {
        id: editingSchedule.id,
        ...formData,
      };
      updateMutation.mutate(updateData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja eliminar esta escala?")) {
      deleteMutation.mutate(id);
    }
  };

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case "manha":
        return "bg-yellow-900/30 text-yellow-400 border border-yellow-700/30";
      case "tarde":
        return "bg-orange-900/30 text-orange-400 border border-orange-700/30";
      case "noite":
        return "bg-purple-900/30 text-purple-400 border border-purple-700/30";
      default:
        return "bg-gray-900/30 text-gray-400 border border-gray-700/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmada":
        return "bg-green-900/30 text-green-400 border border-green-700/30";
      case "pendente":
        return "bg-yellow-900/30 text-yellow-400 border border-yellow-700/30";
      case "cancelada":
        return "bg-red-900/30 text-red-400 border border-red-700/30";
      default:
        return "bg-gray-900/30 text-gray-400 border border-gray-700/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Escala</h1>
          <p className="text-gray-400 mt-1">Atribuição automática por sector e turno</p>
        </div>
      </div>

      <Card className="bg-slate-800/50 border-orange-700/30">
        <CardHeader>
          <CardTitle className="text-white">Criar Nova Escala</CardTitle>
          <CardDescription className="text-gray-400">Atribua membros da equipa a turnos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-gray-300">Membro da Equipa</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team: any) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Turno</Label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noite">Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Data</Label>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="mt-1 w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleCreateSchedule} className="bg-orange-600 hover:bg-orange-700 w-full">
                <Plus className="w-4 h-4 mr-2" />
                Criar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-orange-700/30">
        <CardHeader>
          <CardTitle className="text-white">Escalas Registadas</CardTitle>
          <CardDescription className="text-gray-400">{schedules.length} escalas encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-400 mt-2">Carregando...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">Nenhuma escala encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-orange-700/30 hover:bg-slate-700/50">
                    <TableHead className="text-gray-300">Membro</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-orange-400">Turno</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-orange-400">Sector</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-orange-400">Data</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-orange-400">Status</TableHead>
                    <TableHead className="text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule: any) => (
                    <TableRow key={schedule.id} className="border-orange-700/20 hover:bg-slate-700/30">
                      <TableCell className="font-medium text-white">{schedule.teamName || "Sem nome"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition capitalize ${getShiftColor(schedule.shift)}`}
                          onClick={() => handleInlineEdit(schedule, "shift")}
                        >
                          {schedule.shift}
                        </span>
                      </TableCell>
                      <TableCell
                        className="text-gray-300 cursor-pointer hover:text-orange-400 transition"
                        onClick={() => handleInlineEdit(schedule, "sector")}
                      >
                        {schedule.sector}
                      </TableCell>
                      <TableCell
                        className="text-gray-300 cursor-pointer hover:text-orange-400 transition"
                        onClick={() => handleInlineEdit(schedule, "date")}
                      >
                        {new Date(schedule.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition capitalize ${getStatusColor(schedule.status)}`}
                          onClick={() => handleInlineEdit(schedule, "status")}
                        >
                          {schedule.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-600 text-orange-500 hover:bg-orange-600/10"
                            onClick={() => handleEditSchedule(schedule)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-500 hover:bg-red-600/10"
                            onClick={() => handleDelete(schedule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição Completa */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-800 border-orange-700/30">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Escala</DialogTitle>
            <DialogDescription className="text-gray-400">
              Actualizar informações da escala
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Turno</Label>
              <Select value={formData.shift} onValueChange={(value: any) => setFormData({ ...formData, shift: value })}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noite">Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Sector</Label>
              <input
                type="text"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                className="mt-1 w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded"
              />
            </div>

            <div>
              <Label className="text-gray-300">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmitEdit}
                className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Guardando..." : "Actualizar"}
              </Button>
              <Button
                onClick={() => setIsDialogOpen(false)}
                variant="outline"
                className="border-slate-600 text-gray-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição Inline */}
      <Dialog open={inlineEditingId !== null} onOpenChange={(open) => !open && setInlineEditingId(null)}>
        <DialogContent className="bg-slate-800 border-orange-700/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Editar {inlineEditField?.charAt(0).toUpperCase()}{inlineEditField?.slice(1)}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Selecione o novo valor para este campo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {inlineEditField === "shift" && (
              <Select value={inlineEditValue} onValueChange={setInlineEditValue}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noite">Noite</SelectItem>
                </SelectContent>
              </Select>
            )}

            {inlineEditField === "sector" && (
              <input
                type="text"
                value={inlineEditValue}
                onChange={(e) => setInlineEditValue(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded"
              />
            )}

            {inlineEditField === "date" && (
              <input
                type="date"
                value={new Date(inlineEditValue).toISOString().split('T')[0]}
                onChange={(e) => setInlineEditValue(new Date(e.target.value).toISOString())}
                className="bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded"
              />
            )}

            {inlineEditField === "status" && (
              <Select value={inlineEditValue} onValueChange={setInlineEditValue}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleInlineSubmit}
                className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                onClick={() => setInlineEditingId(null)}
                variant="outline"
                className="border-slate-600 text-gray-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
