import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Building2, Users, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Rooms() {
  const [roomType, setRoomType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineEditField, setInlineEditField] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    capacity: 0,
    location: "",
    type: "sala" as "sala" | "auditorio" | "cozinha" | "outro",
    status: "disponivel" as "disponivel" | "ocupada" | "manutencao",
  });

  const { data: rooms = [], isLoading, refetch } = trpc.rooms.list.useQuery({
    type: roomType,
    status,
  });

  const { data: reservations = [] } = trpc.roomReservations.list.useQuery();

  const createMutation = trpc.rooms.create.useMutation({
    onSuccess: () => {
      toast.success("Sala criada com sucesso!");
      setFormData({ name: "", capacity: 0, location: "", type: "sala", status: "disponivel" });
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateMutation = trpc.rooms.update.useMutation({
    onSuccess: () => {
      toast.success("Sala actualizada com sucesso!");
      setEditingRoom(null);
      setFormData({ name: "", capacity: 0, location: "", type: "sala", status: "disponivel" });
      setIsDialogOpen(false);
      setInlineEditingId(null);
      setInlineEditField(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = trpc.rooms.delete.useMutation({
    onSuccess: () => {
      toast.success("Sala eliminada com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreateSample = () => {
    setEditingRoom(null);
    setFormData({ name: "", capacity: 0, location: "", type: "sala", status: "disponivel" });
    setIsDialogOpen(true);
  };

  const handleEditRoom = (room: any) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      capacity: room.capacity,
      location: room.location,
      type: room.type,
      status: room.status,
    });
    setIsDialogOpen(true);
  };

  const handleInlineEdit = (room: any, field: string) => {
    setInlineEditingId(room.id);
    setInlineEditField(field);
    setInlineEditValue(String(room[field]));
  };

  const handleInlineSubmit = () => {
    if (inlineEditingId && inlineEditField) {
      const updateData: any = {
        id: inlineEditingId,
      };
      if (inlineEditField === "capacity") {
        updateData[inlineEditField] = parseInt(inlineEditValue) || 0;
      } else {
        updateData[inlineEditField] = inlineEditValue;
      }
      updateMutation.mutate(updateData);
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.location || formData.capacity <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    if (editingRoom) {
      const updateData: any = {
        id: editingRoom.id,
        ...formData,
      };
      updateMutation.mutate(updateData);
    } else {
      const createData: any = {
        name: formData.name,
        capacity: formData.capacity,
        location: formData.location,
        type: formData.type,
      };
      createMutation.mutate(createData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja eliminar esta sala?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "disponivel":
        return "bg-green-900/30 text-green-400 border border-green-700/30";
      case "ocupada":
        return "bg-red-900/30 text-red-400 border border-red-700/30";
      case "manutencao":
        return "bg-yellow-900/30 text-yellow-400 border border-yellow-700/30";
      default:
        return "bg-gray-900/30 text-gray-400 border border-gray-700/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Salas</h1>
          <p className="text-gray-400 mt-1">Gestão de espaços e reservas</p>
        </div>
        <Button onClick={handleCreateSample} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Sala
        </Button>
      </div>

      <Card className="bg-slate-800/50 border-orange-700/30">
        <CardHeader>
          <CardTitle className="text-white">Filtros</CardTitle>
          <CardDescription className="text-gray-400">Filtre salas por tipo e status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Tipo de Sala</label>
              <Select value={roomType} onValueChange={setRoomType}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione um tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sala">Sala</SelectItem>
                  <SelectItem value="auditorio">Auditório</SelectItem>
                  <SelectItem value="cozinha">Cozinha</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="ocupada">Ocupada</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-orange-700/30">
        <CardHeader>
          <CardTitle className="text-white">Salas Disponíveis</CardTitle>
          <CardDescription className="text-gray-400">{rooms.length} salas registadas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-400 mt-2">Carregando...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">Nenhuma sala encontrada</p>
              <Button onClick={handleCreateSample} variant="outline" className="mt-4 border-orange-600 text-orange-500 hover:bg-orange-600/10">
                Criar primeira sala
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-orange-700/30 hover:bg-slate-700/50">
                    <TableHead className="text-gray-300">Nome</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-orange-400">Capacidade</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-orange-400">Localização</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-orange-400">Tipo</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-orange-400">Status</TableHead>
                    <TableHead className="text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room: any) => (
                    <TableRow key={room.id} className="border-orange-700/20 hover:bg-slate-700/30">
                      <TableCell className="font-medium text-white">{room.name}</TableCell>
                      <TableCell
                        className="text-gray-300 cursor-pointer hover:text-orange-400 transition"
                        onClick={() => handleInlineEdit(room, "capacity")}
                      >
                        <Users className="w-4 h-4 inline mr-1" />
                        {room.capacity}
                      </TableCell>
                      <TableCell
                        className="text-gray-300 cursor-pointer hover:text-orange-400 transition"
                        onClick={() => handleInlineEdit(room, "location")}
                      >
                        {room.location}
                      </TableCell>
                      <TableCell
                        className="text-gray-300 cursor-pointer hover:text-orange-400 transition capitalize"
                        onClick={() => handleInlineEdit(room, "type")}
                      >
                        {room.type}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition ${getStatusColor(room.status)}`}
                          onClick={() => handleInlineEdit(room, "status")}
                        >
                          {room.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-600 text-orange-500 hover:bg-orange-600/10"
                            onClick={() => handleEditRoom(room)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-500 hover:bg-red-600/10"
                            onClick={() => handleDelete(room.id)}
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
            <DialogTitle className="text-white">{editingRoom ? "Editar Sala" : "Nova Sala"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingRoom ? "Actualizar informações da sala" : "Criar uma nova sala"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-300">Nome da Sala</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Sala de Reuniões A"
                className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capacity" className="text-gray-300">Capacidade</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
                />
              </div>

              <div>
                <Label htmlFor="type" className="text-gray-300">Tipo</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sala">Sala</SelectItem>
                    <SelectItem value="auditorio">Auditório</SelectItem>
                    <SelectItem value="cozinha">Cozinha</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="location" className="text-gray-300">Localização</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Piso 2"
                className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
              />
            </div>

            {editingRoom && (
              <div>
                <Label htmlFor="status" className="text-gray-300">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="ocupada">Ocupada</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Guardando..." : editingRoom ? "Actualizar" : "Criar"}
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
            {inlineEditField === "capacity" && (
              <Input
                type="number"
                value={inlineEditValue}
                onChange={(e) => setInlineEditValue(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            )}

            {inlineEditField === "location" && (
              <Input
                value={inlineEditValue}
                onChange={(e) => setInlineEditValue(e.target.value)}
                placeholder="Ex: Piso 2"
                className="bg-slate-700 border-slate-600 text-white"
              />
            )}

            {inlineEditField === "type" && (
              <Select value={inlineEditValue} onValueChange={setInlineEditValue}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sala">Sala</SelectItem>
                  <SelectItem value="auditorio">Auditório</SelectItem>
                  <SelectItem value="cozinha">Cozinha</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            )}

            {inlineEditField === "status" && (
              <Select value={inlineEditValue} onValueChange={setInlineEditValue}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="ocupada">Ocupada</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
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
