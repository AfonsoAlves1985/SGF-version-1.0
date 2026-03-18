import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, Edit2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function Schedule() {
  const [activeTab, setActiveTab] = useState<"members" | "schedules">("members");
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>();
  const [selectedShift, setSelectedShift] = useState<string>("manha");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [memberFormData, setMemberFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "limpeza" as "limpeza" | "manutencao" | "admin",
    sector: "",
  });
  const [scheduleFormData, setScheduleFormData] = useState({
    teamId: "",
    shift: "manha" as "manha" | "tarde" | "noite",
    date: new Date(),
    sector: "Geral",
    status: "confirmada" as "confirmada" | "pendente" | "cancelada",
  });

  // Queries
  const { data: schedules = [], isLoading: schedulesLoading, refetch: refetchSchedules } = trpc.schedules.list.useQuery({
    teamId: selectedTeam ? parseInt(selectedTeam) : undefined,
    date: selectedDate,
  });

  const { data: teams = [], refetch: refetchTeams } = trpc.teams.list.useQuery();

  // Mutations - Teams
  const createTeamMutation = trpc.teams.create.useMutation({
    onSuccess: () => {
      toast.success("Membro criado com sucesso!");
      setMemberFormData({ name: "", email: "", phone: "", role: "limpeza", sector: "" });
      setIsMemberDialogOpen(false);
      refetchTeams();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const updateTeamMutation = trpc.teams.update.useMutation({
    onSuccess: () => {
      toast.success("Membro actualizado com sucesso!");
      setMemberFormData({ name: "", email: "", phone: "", role: "limpeza", sector: "" });
      setEditingMemberId(null);
      setIsMemberDialogOpen(false);
      refetchTeams();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteTeamMutation = trpc.teams.delete.useMutation({
    onSuccess: () => {
      toast.success("Membro eliminado com sucesso!");
      refetchTeams();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  // Mutations - Schedules
  const createScheduleMutation = trpc.schedules.create.useMutation({
    onSuccess: () => {
      toast.success("Escala criada com sucesso!");
      setSelectedTeam(undefined);
      setSelectedShift("manha");
      setSelectedDate(new Date());
      refetchSchedules();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const updateScheduleMutation = trpc.schedules.update.useMutation({
    onSuccess: () => {
      toast.success("Escala actualizada com sucesso!");
      setEditingSchedule(null);
      setScheduleFormData({ teamId: "", shift: "manha", date: new Date(), sector: "Geral", status: "confirmada" });
      setIsScheduleDialogOpen(false);
      refetchSchedules();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteScheduleMutation = trpc.schedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Escala eliminada com sucesso!");
      refetchSchedules();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  // Handlers - Teams
  const handleCreateMember = () => {
    if (!memberFormData.name || !memberFormData.role) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (editingMemberId) {
      updateTeamMutation.mutate({
        id: editingMemberId,
        ...memberFormData,
      });
    } else {
      createTeamMutation.mutate(memberFormData);
    }
  };

  const handleEditMember = (member: any) => {
    setEditingMemberId(member.id);
    setMemberFormData({
      name: member.name,
      email: member.email || "",
      phone: member.phone || "",
      role: member.role,
      sector: member.sector || "",
    });
    setIsMemberDialogOpen(true);
  };

  const handleDeleteMember = (id: number) => {
    if (window.confirm("Tem certeza que deseja eliminar este membro?")) {
      deleteTeamMutation.mutate(id);
    }
  };

  const resetMemberForm = () => {
    setMemberFormData({ name: "", email: "", phone: "", role: "limpeza", sector: "" });
    setEditingMemberId(null);
  };

  // Handlers - Schedules
  const handleCreateSchedule = () => {
    if (!selectedTeam) {
      toast.error("Selecione um membro da equipa");
      return;
    }

    createScheduleMutation.mutate({
      teamId: parseInt(selectedTeam),
      date: selectedDate,
      shift: selectedShift as "manha" | "tarde" | "noite",
      sector: "Geral",
    });
  };

  const handleEditSchedule = (schedule: any) => {
    setEditingSchedule(schedule);
    setScheduleFormData({
      teamId: schedule.teamId.toString(),
      shift: schedule.shift,
      date: new Date(schedule.date),
      sector: schedule.sector,
      status: schedule.status,
    });
    setIsScheduleDialogOpen(true);
  };

  const handleUpdateSchedule = () => {
    if (!editingSchedule) return;

    updateScheduleMutation.mutate({
      id: editingSchedule.id,
      ...scheduleFormData,
      teamId: parseInt(scheduleFormData.teamId),
    });
  };

  const handleDeleteSchedule = (id: number) => {
    if (window.confirm("Tem certeza que deseja eliminar esta escala?")) {
      deleteScheduleMutation.mutate(id);
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "limpeza":
        return "Limpeza";
      case "manutencao":
        return "Manutenção";
      case "admin":
        return "Admin";
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Escala</h1>
          <p className="text-gray-400 mt-1">Gestão de membros e atribuição de turnos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-orange-700/20">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "members"
              ? "border-orange-600 text-orange-500"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
        >
          <Users className="h-4 w-4" />
          Membros
        </button>
        <button
          onClick={() => setActiveTab("schedules")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "schedules"
              ? "border-orange-600 text-orange-500"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Escalas
        </button>
      </div>

      {/* MEMBERS TAB */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <Card className="bg-slate-800/50 border-orange-700/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Membros da Equipa</CardTitle>
                <CardDescription className="text-gray-400">{teams.length} membros cadastrados</CardDescription>
              </div>
              <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => resetMemberForm()}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Membro
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-orange-700/30">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {editingMemberId ? "Editar Membro" : "Novo Membro"}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Preencha os dados do membro da equipa
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Nome *</Label>
                      <Input
                        value={memberFormData.name}
                        onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white mt-1"
                        placeholder="Nome completo"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Email</Label>
                      <Input
                        type="email"
                        value={memberFormData.email}
                        onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white mt-1"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Telefone</Label>
                      <Input
                        value={memberFormData.phone}
                        onChange={(e) => setMemberFormData({ ...memberFormData, phone: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white mt-1"
                        placeholder="+351 9XX XXX XXX"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Função *</Label>
                      <Select
                        value={memberFormData.role}
                        onValueChange={(value) => setMemberFormData({ ...memberFormData, role: value as any })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="limpeza">Limpeza</SelectItem>
                          <SelectItem value="manutencao">Manutenção</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Sector</Label>
                      <Input
                        value={memberFormData.sector}
                        onChange={(e) => setMemberFormData({ ...memberFormData, sector: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white mt-1"
                        placeholder="Ex: Piso 1, Escritório"
                      />
                    </div>
                    <Button
                      onClick={handleCreateMember}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      disabled={createTeamMutation.isPending || updateTeamMutation.isPending}
                    >
                      {editingMemberId ? "Actualizar" : "Criar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-orange-700/20 hover:bg-transparent">
                      <TableHead className="text-gray-300">Nome</TableHead>
                      <TableHead className="text-gray-300">Email</TableHead>
                      <TableHead className="text-gray-300">Telefone</TableHead>
                      <TableHead className="text-gray-300">Função</TableHead>
                      <TableHead className="text-gray-300">Sector</TableHead>
                      <TableHead className="text-gray-300">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((member: any) => (
                      <TableRow key={member.id} className="border-orange-700/10 hover:bg-slate-700/30">
                        <TableCell className="text-white font-medium">{member.name}</TableCell>
                        <TableCell className="text-gray-300">{member.email || "-"}</TableCell>
                        <TableCell className="text-gray-300">{member.phone || "-"}</TableCell>
                        <TableCell className="text-gray-300">
                          <span className="inline-block px-2 py-1 rounded bg-orange-600/20 text-orange-400 text-sm">
                            {getRoleLabel(member.role)}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-300">{member.sector || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditMember(member)}
                              className="text-orange-500 hover:text-orange-400 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="text-red-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {teams.length === 0 && (
                  <div className="text-center py-8 text-gray-400">Nenhum membro cadastrado</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SCHEDULES TAB */}
      {activeTab === "schedules" && (
        <div className="space-y-6">
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
                    value={selectedDate.toISOString().split("T")[0]}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="mt-1 w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleCreateSchedule}
                    className="bg-orange-600 hover:bg-orange-700 w-full"
                    disabled={createScheduleMutation.isPending}
                  >
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
              {schedulesLoading ? (
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
                      <TableRow className="border-orange-700/20 hover:bg-transparent">
                        <TableHead className="text-gray-300">Membro</TableHead>
                        <TableHead className="text-gray-300">Turno</TableHead>
                        <TableHead className="text-gray-300">Data</TableHead>
                        <TableHead className="text-gray-300">Sector</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((schedule: any) => (
                        <TableRow key={schedule.id} className="border-orange-700/10 hover:bg-slate-700/30">
                          <TableCell className="text-white font-medium">
                            {teams.find((t: any) => t.id === schedule.teamId)?.name || "Desconhecido"}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {schedule.shift === "manha" ? "Manhã" : schedule.shift === "tarde" ? "Tarde" : "Noite"}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {format(new Date(schedule.date), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                          </TableCell>
                          <TableCell className="text-gray-300">{schedule.sector}</TableCell>
                          <TableCell>
                            <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getStatusColor(schedule.status)}`}>
                              {schedule.status === "confirmada" ? "Confirmada" : schedule.status === "pendente" ? "Pendente" : "Cancelada"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditSchedule(schedule)}
                                className="text-orange-500 hover:text-orange-400 transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="text-red-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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

          {/* Edit Schedule Dialog */}
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogContent className="bg-slate-800 border-orange-700/30">
              <DialogHeader>
                <DialogTitle className="text-white">Editar Escala</DialogTitle>
                <DialogDescription className="text-gray-400">Modifique os dados da escala</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Membro</Label>
                  <Select value={scheduleFormData.teamId} onValueChange={(value) => setScheduleFormData({ ...scheduleFormData, teamId: value })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
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
                  <Select value={scheduleFormData.shift} onValueChange={(value) => setScheduleFormData({ ...scheduleFormData, shift: value as any })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
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
                  <Label className="text-gray-300">Status</Label>
                  <Select value={scheduleFormData.status} onValueChange={(value) => setScheduleFormData({ ...scheduleFormData, status: value as any })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmada">Confirmada</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleUpdateSchedule}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={updateScheduleMutation.isPending}
                >
                  Guardar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
