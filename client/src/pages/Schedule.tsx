import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, addDays } from "date-fns";
import { pt } from "date-fns/locale";

export default function Schedule() {
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>();
  const [selectedShift, setSelectedShift] = useState<string>("manha");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: schedules = [], isLoading, refetch } = trpc.schedules.list.useQuery({
    teamId: selectedTeam ? parseInt(selectedTeam) : undefined,
    date: selectedDate,
  });

  const { data: teams = [] } = trpc.teams.list.useQuery();

  const createMutation = trpc.schedules.create.useMutation({
    onSuccess: () => {
      toast.success("Escala criada com sucesso!");
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

  const weekStart = startOfWeek(selectedDate, { locale: pt });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escala de Equipa</h1>
          <p className="text-gray-600 mt-1">Gestão de turnos e atribuição por sector</p>
        </div>
        <Button onClick={handleCreateSchedule} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Escala
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Escala</CardTitle>
          <CardDescription>Atribua um membro da equipa a um turno</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Membro da Equipa</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team: any) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name} ({team.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Turno</label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhã (6h-14h)</SelectItem>
                  <SelectItem value="tarde">Tarde (14h-22h)</SelectItem>
                  <SelectItem value="noite">Noite (22h-6h)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Data</label>
              <input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleCreateSchedule}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Atribuir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Semana de {format(weekStart, "d 'de' MMMM", { locale: pt })}
            </div>
          </CardTitle>
          <CardDescription>Visualize a escala da semana</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Carregando...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>Nenhuma escala atribuída para esta semana</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule: any) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.teamId}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {schedule.shift}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(schedule.date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{schedule.sector}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          {schedule.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
