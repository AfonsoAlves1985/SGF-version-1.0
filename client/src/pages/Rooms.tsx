import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInputWithCalendar } from "@/components/DateInputWithCalendar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Plus,
  Building2,
  Users,
  Edit2,
  Trash2,
  Calendar,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function parseMaskedDate(value?: string) {
  if (!value || !/^\d{2}-\d{2}-\d{4}$/.test(value)) return null;

  const [day, month, year] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function normalizeDateToMask(value?: string) {
  if (!value) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
  }

  return value;
}

function formatDateToMask(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function parseReservationDate(value?: string | Date | null) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseRoomDateTime(dateValue?: string, timeValue?: string, end = false) {
  if (!dateValue) return null;

  const normalizedDate = normalizeDateToMask(dateValue);
  const maskedDate = parseMaskedDate(normalizedDate);
  if (!maskedDate) return null;

  const parsed = new Date(maskedDate);

  if (timeValue) {
    const [h, m] = timeValue.split(":").map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      parsed.setHours(h, m, 0, 0);
      return parsed;
    }
  }

  if (end) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

function overlapsDayRange(start: Date, end: Date, dayStart: Date, dayEnd: Date) {
  return start.getTime() <= dayEnd.getTime() && end.getTime() >= dayStart.getTime();
}

function isDateRangeValid(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return true;

  const start = parseMaskedDate(startDate);
  const end = parseMaskedDate(endDate);

  if (!start || !end) return false;

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return end.getTime() >= start.getTime();
}

export default function Rooms() {
  const [status, setStatus] = useState("all");
  const [scheduleDate, setScheduleDate] = useState(() =>
    formatDateToMask(new Date())
  );
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineEditField, setInlineEditField] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [useRoomDialogOpen, setUseRoomDialogOpen] = useState(false);
  const [selectedRoomForUse, setSelectedRoomForUse] = useState<any>(null);
  const [useRoomForm, setUseRoomForm] = useState({
    responsibleUserName: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    capacity: 0,
    location: "",
    type: "sala" as const,
    status: "disponivel" as const,
    responsibleUserName: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    isReleased: 0,
  });

  const {
    data: rooms = [],
    isLoading,
    refetch,
  } = trpc.rooms.list.useQuery();

  const { data: reservations = [] } = trpc.roomReservations.list.useQuery();

  const now = new Date();

  const activeReservationRoomIds = useMemo(() => {
    const roomIds = new Set<number>();

    for (const reservation of reservations as any[]) {
      if (reservation.status === "cancelada") continue;

      const start = parseReservationDate(reservation.startTime);
      const end = parseReservationDate(reservation.endTime);
      if (!start || !end) continue;

      if (now >= start && now <= end) {
        roomIds.add(Number(reservation.roomId));
      }
    }

    return roomIds;
  }, [now, reservations]);

  const roomCurrentStatusById = useMemo(() => {
    const map = new Map<number, "disponivel" | "ocupada" | "manutencao">();

    for (const room of rooms as any[]) {
      if (room.status === "manutencao") {
        map.set(room.id, "manutencao");
        continue;
      }

      const roomStart = parseRoomDateTime(room.startDate, room.startTime);
      const roomEnd = parseRoomDateTime(room.endDate, room.endTime, true);

      const roomUsageActiveNow =
        !!roomStart && !!roomEnd && now >= roomStart && now <= roomEnd;

      const occupiedNow =
        roomUsageActiveNow || activeReservationRoomIds.has(Number(room.id));

      if (occupiedNow) {
        map.set(room.id, "ocupada");
        continue;
      }

      map.set(room.id, "disponivel");
    }

    return map;
  }, [activeReservationRoomIds, now, rooms]);

  const displayedRooms = useMemo(() => {
    if (status === "all") return rooms;

    return (rooms as any[]).filter(room => {
      const currentStatus = roomCurrentStatusById.get(room.id) || "disponivel";
      return currentStatus === status;
    });
  }, [roomCurrentStatusById, rooms, status]);

  const selectedScheduleDate = parseMaskedDate(scheduleDate) || new Date();
  const selectedScheduleStart = new Date(selectedScheduleDate);
  selectedScheduleStart.setHours(0, 0, 0, 0);
  const selectedScheduleEnd = new Date(selectedScheduleDate);
  selectedScheduleEnd.setHours(23, 59, 59, 999);

  const roomsById = new Map<number, any>(rooms.map((room: any) => [room.id, room]));

  const scheduleItems = [
    ...(reservations as any[])
      .filter(reservation => reservation.status !== "cancelada")
      .map(reservation => {
        const start = parseReservationDate(reservation.startTime);
        const end = parseReservationDate(reservation.endTime);
        if (!start || !end) return null;

        const roomName =
          roomsById.get(reservation.roomId)?.name || `Sala #${reservation.roomId}`;

        return {
          id: `reservation-${reservation.id}`,
          roomId: reservation.roomId,
          roomName,
          start,
          end,
          source: "reserva" as const,
        };
      })
      .filter(Boolean),
    ...(rooms as any[])
      .map(room => {
        const start = parseRoomDateTime(room.startDate, room.startTime);
        const end = parseRoomDateTime(room.endDate, room.endTime, true);
        if (!start || !end) return null;

        return {
          id: `room-usage-${room.id}`,
          roomId: room.id,
          roomName: room.name,
          start,
          end,
          source: "uso" as const,
        };
      })
      .filter(Boolean),
  ] as Array<{
    id: string;
    roomId: number;
    roomName: string;
    start: Date;
    end: Date;
    source: "reserva" | "uso";
  }>;

  const hasScheduleOnDate = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return scheduleItems.some(item =>
      overlapsDayRange(item.start, item.end, dayStart, dayEnd)
    );
  };

  const scheduleItemsOnSelectedDate = scheduleItems
    .filter(item =>
      overlapsDayRange(
        item.start,
        item.end,
        selectedScheduleStart,
        selectedScheduleEnd
      )
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const hasReservationOnSelectedDate = (roomId: number) => {
    return scheduleItems.some(item => {
      if (item.roomId !== roomId) return false;
      return overlapsDayRange(
        item.start,
        item.end,
        selectedScheduleStart,
        selectedScheduleEnd
      );
    });
  };

  const createMutation = trpc.rooms.create.useMutation({
    onSuccess: () => {
      toast.success("Sala criada com sucesso!");
      setFormData({
        name: "",
        capacity: 0,
        location: "",
        type: "sala",
        status: "disponivel",
        responsibleUserName: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        isReleased: 0,
      });
      setIsDialogOpen(false);
      refetch();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateMutation = trpc.rooms.update.useMutation({
    onSuccess: () => {
      toast.success("Sala actualizada com sucesso!");
      setEditingRoom(null);
      setFormData({
        name: "",
        capacity: 0,
        location: "",
        type: "sala",
        status: "disponivel",
        responsibleUserName: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        isReleased: 0,
      });
      setIsDialogOpen(false);
      setInlineEditingId(null);
      setInlineEditField(null);
      refetch();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = trpc.rooms.delete.useMutation({
    onSuccess: () => {
      toast.success("Sala eliminada com sucesso!");
      refetch();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreateSample = () => {
    setEditingRoom(null);
    setFormData({
      name: "",
      capacity: 0,
      location: "",
      type: "sala",
      status: "disponivel",
      responsibleUserName: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      isReleased: 0,
    });
    setIsDialogOpen(true);
  };

  const handleReleaseRoom = (roomId: number) => {
    const room = rooms.find((r: any) => r.id === roomId);
    if (!room) return;

    updateMutation.mutate({
      id: roomId,
      name: room.name,
      capacity: room.capacity,
      location: room.location,
      type: room.type,
      responsibleUserName: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      status: "disponivel",
    });
  };

  const handleOpenUseRoom = (room: any) => {
    setSelectedRoomForUse(room);
    setUseRoomForm({
      responsibleUserName: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
    });
    setUseRoomDialogOpen(true);
  };

  const handleConfirmUseRoom = () => {
    if (!selectedRoomForUse) return;
    if (!useRoomForm.responsibleUserName.trim()) {
      toast.error("Informe o nome do solicitante");
      return;
    }
    if (!useRoomForm.startDate || !useRoomForm.endDate) {
      toast.error("Informe as datas de uso");
      return;
    }

    if (
      !parseMaskedDate(useRoomForm.startDate) ||
      !parseMaskedDate(useRoomForm.endDate)
    ) {
      toast.error("Use o formato DD-MM-YYYY para as datas.");
      return;
    }

    if (!isDateRangeValid(useRoomForm.startDate, useRoomForm.endDate)) {
      toast.error("A data de término não pode ser anterior à data de início");
      return;
    }

    updateMutation.mutate({
      id: selectedRoomForUse.id,
      name: selectedRoomForUse.name,
      capacity: selectedRoomForUse.capacity,
      location: selectedRoomForUse.location,
      type: selectedRoomForUse.type,
      status: "ocupada",
      responsibleUserName: useRoomForm.responsibleUserName,
      startDate: useRoomForm.startDate,
      endDate: useRoomForm.endDate,
      startTime: useRoomForm.startTime,
      endTime: useRoomForm.endTime,
    });
    setUseRoomDialogOpen(false);
  };

  const handleEditRoom = (room: any) => {
    setEditingRoom(room);

    setFormData({
      name: room.name,
      capacity: room.capacity,
      location: room.location,
      type: room.type,
      status: room.status,

      responsibleUserName: room.responsibleUserName || "",
      startDate: normalizeDateToMask(room.startDate || ""),
      endDate: normalizeDateToMask(room.endDate || ""),
      startTime: room.startTime || "",
      endTime: room.endTime || "",
      isReleased: room.isReleased || 0,
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
      const room = rooms.find((r: any) => r.id === inlineEditingId);
      if (!room) return;

      const updateData: any = {
        id: inlineEditingId,
        name: room.name,
        capacity: room.capacity,
        location: room.location,
        type: room.type,
        status: room.status,

        responsibleUserName: room.responsibleUserName,
        startDate: room.startDate,
        endDate: room.endDate,
        startTime: room.startTime,
        endTime: room.endTime,
        isReleased: room.isReleased,
      };

      // Update only the edited field
      if (inlineEditField === "capacity") {
        updateData[inlineEditField] = parseInt(inlineEditValue) || 0;
      } else if (
        inlineEditField === "startDate" ||
        inlineEditField === "endDate"
      ) {
        updateData[inlineEditField] = inlineEditValue || undefined;
      } else {
        updateData[inlineEditField] = inlineEditValue || undefined;
      }

      // Validar datas se ambas estão definidas
      if (updateData.startDate && updateData.endDate) {
        if (
          !parseMaskedDate(updateData.startDate) ||
          !parseMaskedDate(updateData.endDate)
        ) {
          toast.error("Use o formato DD-MM-YYYY para as datas");
          setInlineEditingId(null);
          setInlineEditField(null);
          return;
        }

        if (!isDateRangeValid(updateData.startDate, updateData.endDate)) {
          toast.error(
            "A data de término não pode ser anterior à data de início"
          );
          setInlineEditingId(null);
          setInlineEditField(null);
          return;
        }
      }

      updateMutation.mutate(updateData);
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.location || formData.capacity <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    // Validar datas
    if (formData.startDate && formData.endDate) {
      if (
        !parseMaskedDate(formData.startDate) ||
        !parseMaskedDate(formData.endDate)
      ) {
        toast.error("Use o formato DD-MM-YYYY para as datas");
        return;
      }

      if (!isDateRangeValid(formData.startDate, formData.endDate)) {
        toast.error("A data de término não pode ser anterior à data de início");
        return;
      }
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
        return "bg-green-900/30 text-green-950 dark:text-green-300 border border-green-700/30";
      case "ocupada":
        return "bg-red-900/30 text-red-800 dark:text-red-300 border border-red-700/30";
      case "manutencao":
        return "bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-700/30";
      default:
        return "bg-gray-900/30 text-gray-700 dark:text-gray-300 border border-gray-700/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Salas</h1>
          <p className="text-gray-400 mt-1">Gestão de espaços e reservas</p>
        </div>
        <Button
          onClick={handleCreateSample}
          className="w-full bg-sky-600 hover:bg-sky-700 sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Sala
        </Button>
      </div>

      <Card className="bg-slate-800/50 border-sky-700/30">
        <CardHeader>
          <CardTitle className="text-white">Filtros</CardTitle>
          <CardDescription className="text-gray-400">
            Filtre salas por status e consulte agendamentos por data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="max-w-xs">
              <label className="text-sm font-medium text-gray-300">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="ocupada">Ocupada</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-w-xs">
              <label className="text-sm font-medium text-gray-300">
                Data para consulta de disponibilidade
              </label>
              <DateInputWithCalendar
                value={scheduleDate}
                onChange={setScheduleDate}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                calendarClassName="[&_.rdp-cell]:text-white [&_.rdp-button]:text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edição Completa */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-800 border-sky-700/30">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingRoom ? "Editar Sala" : "Nova Sala"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingRoom
                ? "Actualizar informações da sala"
                : "Criar uma nova sala"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-300">
                Nome da Sala
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Sala de Reuniões A"
                className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capacity" className="text-gray-300">
                  Capacidade
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      capacity: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
                />
              </div>

              <div>
                <Label htmlFor="type" className="text-gray-300">
                  Tipo
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, type: value })
                  }
                >
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
              <Label htmlFor="location" className="text-gray-300">
                Localização
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={e =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Ex: Piso 2"
                className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <Label htmlFor="responsibleUserName" className="text-gray-300">
                Nome do Solicitante
              </Label>
              <Input
                id="responsibleUserName"
                type="text"
                placeholder="Nome completo do responsável"
                value={formData.responsibleUserName}
                onChange={e =>
                  setFormData({
                    ...formData,
                    responsibleUserName: e.target.value,
                  })
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-gray-300">
                  Data de Início
                </Label>
                <Input
                  id="startDate"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={(formData.startDate as string) || ""}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      startDate: formatDateInput(e.target.value),
                    })
                  }
                  placeholder="DD-MM-YYYY"
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-gray-300">
                  Data de Fim
                </Label>
                <Input
                  id="endDate"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={(formData.endDate as string) || ""}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      endDate: formatDateInput(e.target.value),
                    })
                  }
                  placeholder="DD-MM-YYYY"
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime" className="text-gray-300">
                  Hora de Início
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={e =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="endTime" className="text-gray-300">
                  Hora de Fim
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={e =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {editingRoom && (
              <div>
                <Label htmlFor="status" className="text-gray-300">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
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

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                className="bg-sky-600 hover:bg-sky-700 text-white flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Guardando..."
                  : editingRoom
                    ? "Actualizar"
                    : "Criar"}
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
      <Dialog
        open={inlineEditingId !== null}
        onOpenChange={open => !open && setInlineEditingId(null)}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm max-h-[90vh] overflow-y-auto bg-slate-800 border-sky-700/30">
          <DialogHeader>
            <DialogTitle className="text-white">
              Editar {inlineEditField?.charAt(0).toUpperCase()}
              {inlineEditField?.slice(1)}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Selecione o novo valor para este campo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {inlineEditField === "capacity" && (
              <Input
                type="number"
                value={inlineEditValue}
                onChange={e => setInlineEditValue(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            )}

            {inlineEditField === "location" && (
              <Input
                value={inlineEditValue}
                onChange={e => setInlineEditValue(e.target.value)}
                placeholder="Ex: Piso 2"
                className="bg-slate-700 border-slate-600 text-white"
              />
            )}

            {inlineEditField === "type" && (
              <Select
                value={inlineEditValue}
                onValueChange={setInlineEditValue}
              >
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
              <Select
                value={inlineEditValue}
                onValueChange={setInlineEditValue}
              >
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

            {inlineEditField === "responsibleUserName" && (
              <Input
                type="text"
                value={inlineEditValue}
                onChange={e => setInlineEditValue(e.target.value)}
                placeholder="Nome completo do responsavel"
                className="bg-slate-700 border-slate-600 text-white"
              />
            )}

            {inlineEditField === "startDate" && (
              <Input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={inlineEditValue}
                onChange={e =>
                  setInlineEditValue(formatDateInput(e.target.value))
                }
                placeholder="DD-MM-YYYY"
                className="bg-slate-700 border-slate-600 text-white"
              />
            )}

            {inlineEditField === "endDate" && (
              <Input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={inlineEditValue}
                onChange={e =>
                  setInlineEditValue(formatDateInput(e.target.value))
                }
                placeholder="DD-MM-YYYY"
                className="bg-slate-700 border-slate-600 text-white"
              />
            )}

            {inlineEditField === "startTime" && (
              <Input
                type="time"
                value={inlineEditValue}
                onChange={e => setInlineEditValue(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            )}

            {inlineEditField === "endTime" && (
              <Input
                type="time"
                value={inlineEditValue}
                onChange={e => setInlineEditValue(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleInlineSubmit}
                className="bg-sky-600 hover:bg-sky-700 text-white flex-1"
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

      {/* Dashboard de Tempo de Uso */}
      <Card className="bg-slate-800/50 border-sky-700/30">
        <CardHeader>
          <CardTitle className="text-white">Tempo de Uso das Salas</CardTitle>
          <CardDescription className="text-gray-400">
            Acompanhe o tempo decorrido e alertas de entrega
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedRooms.map((room: any) => {
              const roomStart = parseRoomDateTime(room.startDate, room.startTime);
              const roomEnd = parseRoomDateTime(room.endDate, room.endTime, true);
              const reservedOnSelectedDate = hasReservationOnSelectedDate(room.id);
              const occupiedByRoomPeriod =
                !!roomStart &&
                !!roomEnd &&
                roomStart.getTime() <= selectedScheduleEnd.getTime() &&
                roomEnd.getTime() >= selectedScheduleStart.getTime();

              // Sala em manutenção: sempre destacar em amarelo
              const currentStatus =
                roomCurrentStatusById.get(room.id) || "disponivel";

              if (currentStatus === "manutencao") {
                return (
                  <Card
                    key={room.id}
                    className="bg-yellow-900/30 border-yellow-700/40 border relative"
                  >
                    <button
                      onClick={() => handleEditRoom(room)}
                      className="absolute top-2 right-8 text-gray-500 hover:text-blue-500 transition-colors p-1"
                      title="Editar sala"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir a sala "${room.name}"?`)) {
                          deleteMutation.mutate(room.id);
                        }
                      }}
                      className="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition-colors p-1"
                      title="Excluir sala"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-white font-semibold text-sm">
                            {room.name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            Capacidade: {room.capacity} pessoas
                          </p>
                        </div>
                        <div className="pt-2 border-t border-yellow-700/40">
                          <p className="text-xs font-semibold text-white mb-1">
                            Status:{" "}
                            <span className="text-yellow-300">Manutenção</span>
                          </p>
                          <p className="text-xs text-yellow-200">
                            Aviso de manutenção ativa
                          </p>
                          <Button
                            onClick={() => handleReleaseRoom(room.id)}
                            className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1"
                            disabled={updateMutation.isPending}
                          >
                            Liberar Sala
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // Sala sem datas = disponível para uso
              if (!occupiedByRoomPeriod && !reservedOnSelectedDate) {
                return (
                  <Card
                    key={room.id}
                    className="bg-emerald-900/30 border-emerald-700/30 border relative"
                  >
                    <button
                      onClick={() => handleEditRoom(room)}
                      className="absolute top-2 right-8 text-gray-500 hover:text-blue-500 transition-colors p-1"
                      title="Editar sala"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir a sala "${room.name}"?`)) {
                          deleteMutation.mutate(room.id);
                        }
                      }}
                      className="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition-colors p-1"
                      title="Excluir sala"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-white font-semibold text-sm">
                            {room.name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            Capacidade: {room.capacity} pessoas
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-700">
                          <p className="text-xs font-semibold text-white mb-1">
                            Status:{" "}
                            <span className="text-emerald-950 dark:text-emerald-300">
                              Disponível
                            </span>
                          </p>
                          <p className="text-xs text-gray-400">
                            Disponível para a data consultada
                          </p>
                          <Button
                            onClick={() => handleOpenUseRoom(room)}
                            className="mt-2 w-full bg-sky-600 hover:bg-sky-700 text-white text-xs py-1"
                            disabled={updateMutation.isPending}
                          >
                            Utilizar Sala
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              const startDate = roomStart || selectedScheduleStart;
              const endDate = roomEnd || selectedScheduleEnd;

              const nowBrasilia = selectedScheduleDate;

              const totalDuration = endDate.getTime() - startDate.getTime();
              // Calcular tempo decorrido considerando os limites [startDate, endDate]
              let elapsedTime = 0;
              if (nowBrasilia >= startDate && nowBrasilia <= endDate) {
                // Dentro do intervalo: tempo desde o início até agora
                elapsedTime = nowBrasilia.getTime() - startDate.getTime();
              } else if (nowBrasilia > endDate) {
                // Após o fim: tempo total (100%)
                elapsedTime = totalDuration;
              }
              // Se nowBrasilia < startDate, elapsedTime permanece 0

              const remainingTime = Math.max(
                endDate.getTime() - nowBrasilia.getTime(),
                0
              );
              const usagePercentage =
                totalDuration > 0 ? (elapsedTime / totalDuration) * 100 : 0;

              let alertStatus = "normal";
              let alertColor = "bg-green-900/30 border-green-700/30";
              let alertText = "Normal";

              if (nowBrasilia < startDate) {
                // Ainda não começou
                alertStatus = "aguardando";
                alertColor = "bg-slate-800/50 border-slate-600/30";
                alertText = "Aguardando Início";
              } else if (remainingTime <= 0) {
                alertStatus = "entregue";
                alertColor = "bg-blue-900/30 border-blue-700/30";
                alertText = "Entregue";
              } else if (remainingTime <= 24 * 60 * 60 * 1000) {
                alertStatus = "proximo_vencimento";
                alertColor = "bg-red-900/30 border-red-700/30";
                alertText = "Próximo Vencimento";
              } else if (remainingTime <= 3 * 24 * 60 * 60 * 1000) {
                alertStatus = "aviso";
                alertColor = "bg-yellow-900/30 border-yellow-700/30";
                alertText = "Aviso";
              }

              const cardStatusLabel =
                reservedOnSelectedDate || currentStatus === "ocupada"
                  ? "Ocupada"
                  : alertText;

              return (
                <Card key={room.id} className={`${alertColor} border relative`}>
                  <button
                    onClick={() => handleEditRoom(room)}
                    className="absolute top-2 right-8 text-gray-500 hover:text-blue-500 transition-colors p-1"
                    title="Editar sala"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir a sala "${room.name}"?`)) {
                        deleteMutation.mutate(room.id);
                      }
                    }}
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition-colors p-1"
                    title="Excluir sala"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-white font-semibold text-sm">
                          {room.name}
                        </p>
                        {room.responsibleUserName &&
                        room.responsibleUserName.trim() ? (
                          <p className="text-sky-400 text-xs font-medium">
                            Solicitante:{" "}
                            <span className="text-white">
                              {room.responsibleUserName}
                            </span>
                          </p>
                        ) : (
                          <p className="text-gray-500 text-xs italic">
                            Solicitante não informado
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">
                            Progresso de Uso
                          </span>
                          <span className="text-gray-300">
                            {Math.round(usagePercentage)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-sky-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(usagePercentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-400">Início</p>
                          <p className="text-gray-300">
                            {startDate.toLocaleDateString("pt-PT")}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Fim</p>
                          <p className="text-gray-300">
                            {endDate.toLocaleDateString("pt-PT")}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-700">
                        <p className="text-xs font-semibold text-white mb-1">
                          Status:{" "}
                          <span className="text-sky-400">{cardStatusLabel}</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          {selectedScheduleDate < startDate
                            ? `Inicia em ${Math.ceil((startDate.getTime() - selectedScheduleDate.getTime()) / (1000 * 60 * 60 * 24))} dia(s)`
                            : remainingTime > 0
                              ? `Faltam ${Math.ceil(remainingTime / (1000 * 60 * 60 * 24))} dias`
                              : "Prazo expirado"}
                        </p>
                        {currentStatus === "ocupada" && (
                          <Button
                            onClick={() => handleReleaseRoom(room.id)}
                            className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1"
                            disabled={updateMutation.isPending}
                          >
                            Liberar Sala
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {displayedRooms.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">
                {rooms.length === 0
                  ? "Nenhuma sala cadastrada"
                  : "Nenhuma sala no status selecionado"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-sky-700/30">
        <CardHeader>
          <CardTitle className="text-white">
            Calendário de Agendamentos de Salas
          </CardTitle>
          <CardDescription className="text-gray-400">
            Datas com agendamento ficam marcadas. Selecione um dia para ver qual
            sala será utilizada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <CalendarComponent
                mode="single"
                selected={selectedScheduleDate}
                onSelect={date => {
                  if (!date) return;
                  setScheduleDate(formatDateToMask(date));
                }}
                modifiers={{
                  hasSchedule: date => hasScheduleOnDate(date),
                }}
                modifiersClassNames={{
                  hasSchedule:
                    "bg-sky-900/40 text-sky-200 font-semibold ring-1 ring-sky-500/40",
                }}
                className="w-full [&_.rdp-cell]:text-white [&_.rdp-button]:text-white [&_.rdp-month]:w-full"
              />
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <p className="text-sm font-medium text-gray-200">
                Salas agendadas em {scheduleDate}
              </p>
              {scheduleItemsOnSelectedDate.length === 0 ? (
                <p className="mt-3 text-sm text-gray-400">
                  Nenhum agendamento para esta data.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {scheduleItemsOnSelectedDate.map(item => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-1 rounded-md border border-slate-700/70 bg-slate-800/50 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white">
                          {item.roomName}
                        </span>
                        <span className="text-xs text-sky-300">
                          {item.source === "reserva" ? "Reserva" : "Uso"}
                        </span>
                      </div>
                      <span className="text-gray-400">
                        {item.start.toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" - "}
                        {item.end.toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Utilizar Sala */}
      <Dialog open={useRoomDialogOpen} onOpenChange={setUseRoomDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Utilizar Sala</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedRoomForUse?.name} &mdash; Preencha os dados do
              solicitante e período de uso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Nome do Solicitante *</Label>
              <Input
                type="text"
                placeholder="Nome completo do responsável"
                value={useRoomForm.responsibleUserName}
                onChange={e =>
                  setUseRoomForm({
                    ...useRoomForm,
                    responsibleUserName: e.target.value,
                  })
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Data de Início *</Label>
                <DateInputWithCalendar
                  value={useRoomForm.startDate}
                  onChange={date =>
                    setUseRoomForm({
                      ...useRoomForm,
                      startDate: date,
                    })
                  }
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                  calendarClassName="[&_.rdp-cell]:text-white [&_.rdp-button]:text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Data de Fim *</Label>
                <DateInputWithCalendar
                  value={useRoomForm.endDate}
                  onChange={date =>
                    setUseRoomForm({
                      ...useRoomForm,
                      endDate: date,
                    })
                  }
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                  calendarClassName="[&_.rdp-cell]:text-white [&_.rdp-button]:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Hora de Início</Label>
                <Input
                  type="time"
                  value={useRoomForm.startTime}
                  onChange={e =>
                    setUseRoomForm({
                      ...useRoomForm,
                      startTime: e.target.value,
                    })
                  }
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Hora de Fim</Label>
                <Input
                  type="time"
                  value={useRoomForm.endTime}
                  onChange={e =>
                    setUseRoomForm({ ...useRoomForm, endTime: e.target.value })
                  }
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={handleConfirmUseRoom}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white"
                disabled={updateMutation.isPending}
              >
                Confirmar Uso
              </Button>
              <Button
                variant="outline"
                onClick={() => setUseRoomDialogOpen(false)}
                className="flex-1 border-slate-600 text-gray-300"
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
