import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface WeeklyMovementsDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  consumableId: number;
  spaceId: number | null;
  consumableName: string;
}

const DAYS_OF_WEEK = [
  { key: "mondayStock", label: "Segunda", short: "Seg" },
  { key: "tuesdayStock", label: "Terça", short: "Ter" },
  { key: "wednesdayStock", label: "Quarta", short: "Qua" },
  { key: "thursdayStock", label: "Quinta", short: "Qui" },
  { key: "fridayStock", label: "Sexta", short: "Sex" },
  { key: "saturdayStock", label: "Sábado", short: "Sab" },
  { key: "sundayStock", label: "Domingo", short: "Dom" },
];

export function WeeklyMovementsDrawer({
  isOpen,
  onOpenChange,
  consumableId,
  spaceId,
  consumableName,
}: WeeklyMovementsDrawerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStartDate, setWeekStartDate] = useState<Date>(new Date());
  const [localMovements, setLocalMovements] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Calculate week start date (Monday)
  useEffect(() => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    setWeekStartDate(monday);
  }, [selectedDate]);

  const { data: movements = [], isLoading, refetch } = trpc.consumableWeeklyMovements.list.useQuery(
    {
      consumableId,
      spaceId: spaceId || 0,
    },
    { enabled: isOpen && !!spaceId }
  );

  const updateMutation = trpc.consumableWeeklyMovements.update.useMutation({
    onSuccess: () => {
      toast.success("Movimentação salva!");
      refetch();
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSaving(false);
    },
  });

  const createMutation = trpc.consumableWeeklyMovements.create.useMutation({
    onSuccess: () => {
      toast.success("Movimentação criada!");
      refetch();
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSaving(false);
    },
  });

  // Find or create movement for selected week
  const currentWeekMovement = movements.find((m: any) => {
    const movementDate = new Date(m.weekStartDate);
    return (
      movementDate.getFullYear() === weekStartDate.getFullYear() &&
      movementDate.getMonth() === weekStartDate.getMonth() &&
      movementDate.getDate() === weekStartDate.getDate()
    );
  });

  // Initialize local movements when current week movement changes
  useEffect(() => {
    if (currentWeekMovement) {
      const movements: Record<string, number> = {};
      DAYS_OF_WEEK.forEach((day) => {
        movements[day.key] = currentWeekMovement[day.key as keyof typeof currentWeekMovement] || 0;
      });
      setLocalMovements(movements);
    } else {
      setLocalMovements(
        DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day.key]: 0 }), {})
      );
    }
  }, [currentWeekMovement]);

  const handleDayChange = (day: string, value: number) => {
    setLocalMovements((prev) => ({
      ...prev,
      [day]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const totalMovement = DAYS_OF_WEEK.reduce(
      (sum, d) => sum + (localMovements[d.key] || 0),
      0
    );

    if (currentWeekMovement) {
      await updateMutation.mutateAsync({
        id: currentWeekMovement.id,
        ...localMovements,
        totalMovement,
      } as any);
    } else {
      const weekNumber = Math.ceil(
        (weekStartDate.getDate() +
          new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), 1).getDay()) /
          7
      );

      await createMutation.mutateAsync({
        consumableId,
        spaceId: spaceId || 0,
        weekStartDate: weekStartDate.toISOString().split("T")[0],
        weekNumber,
        year: weekStartDate.getFullYear(),
        ...localMovements,
        totalMovement,
      } as any);
    }
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

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    };

    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const totalMovement = DAYS_OF_WEEK.reduce(
    (sum, d) => sum + (localMovements[d.key] || 0),
    0
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[600px] bg-slate-900 border-sky-700/20 p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-sky-700/20">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-white text-xl">{consumableName}</SheetTitle>
              <SheetDescription className="text-gray-400 mt-1">Movimentações Semanais</SheetDescription>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center flex-1 text-gray-400">
            <p>Carregando...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Week Selector */}
            <Card className="bg-slate-800/50 border-sky-700/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={handlePreviousWeek}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-300" />
                  </button>
                  <div className="text-center flex-1">
                    <p className="text-sm text-gray-400">Semana de</p>
                    <p className="text-lg font-semibold text-white">{formatWeekRange()}</p>
                  </div>
                  <button
                    onClick={handleNextWeek}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Calendar */}
            <Card className="bg-slate-800/50 border-sky-700/20">
              <CardHeader>
                <CardTitle className="text-white text-sm">Selecione uma Data</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="w-full [&_.rdp-cell]:text-white [&_.rdp-button]:text-white [&_.rdp-button_today]:bg-sky-600 [&_.rdp-button_selected]:bg-sky-600 [&_.rdp-button_selected]:text-white"
                />
              </CardContent>
            </Card>

            {/* Daily Movements */}
            <Card className="bg-slate-800/50 border-sky-700/20">
              <CardHeader>
                <CardTitle className="text-white text-sm">Movimentações Diárias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.key} className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">{day.label}</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={localMovements[day.key] || 0}
                        onChange={(e) =>
                          handleDayChange(day.key, parseInt(e.target.value) || 0)
                        }
                        className="bg-slate-700 border-slate-600 text-white font-semibold text-lg h-12"
                        placeholder="0"
                      />
                      <span className="text-sm text-gray-400 min-w-fit">unidades</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Total */}
            <Card className="bg-sky-900/30 border-sky-700/50">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Total da Semana:</span>
                  <span className="text-3xl font-bold text-sky-400">{totalMovement}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer with Save Button */}
        <div className="px-6 py-4 border-t border-sky-700/20 space-y-3">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white h-12 font-semibold"
          >
            {isSaving ? "Salvando..." : "Salvar Movimentações"}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full border-slate-600 text-gray-300 hover:bg-slate-800 h-12"
          >
            Fechar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
