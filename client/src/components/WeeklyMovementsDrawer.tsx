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
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  { key: "mondayStock", label: "Segunda" },
  { key: "tuesdayStock", label: "Terça" },
  { key: "wednesdayStock", label: "Quarta" },
  { key: "thursdayStock", label: "Quinta" },
  { key: "fridayStock", label: "Sexta" },
  { key: "saturdayStock", label: "Sábado" },
  { key: "sundayStock", label: "Domingo" },
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
      toast.success("Movimentação atualizada!");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const createMutation = trpc.consumableWeeklyMovements.create.useMutation({
    onSuccess: () => {
      toast.success("Movimentação criada!");
      refetch();
    },
    onError: (error) => toast.error(error.message),
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

  const handleDayChange = async (day: string, value: number) => {
    if (!currentWeekMovement) {
      // Create new movement
      const totalMovement = DAYS_OF_WEEK.reduce((sum, d) => {
        if (d.key === day) return sum + value;
        return sum;
      }, 0);

      await createMutation.mutateAsync({
        consumableId,
        spaceId: spaceId || 0,
        weekStartDate: weekStartDate.toISOString().split("T")[0],
        weekNumber: Math.ceil((weekStartDate.getDate() + new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), 1).getDay()) / 7),
        year: weekStartDate.getFullYear(),
        [day]: value,
        totalMovement,
      } as any);
    } else {
      // Update existing movement
      const updatedData = {
        ...currentWeekMovement,
        [day]: value,
      };

      const newTotal = DAYS_OF_WEEK.reduce((sum, d) => sum + (updatedData[d.key as keyof typeof updatedData] as number || 0), 0);

      await updateMutation.mutateAsync({
        id: currentWeekMovement.id,
        ...updatedData,
        totalMovement: newTotal,
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

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[800px] bg-slate-800 border-orange-700/20 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">Movimentações Semanais</SheetTitle>
          <SheetDescription className="text-gray-400">{consumableName}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-96 text-gray-400">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Left: Calendar */}
            <div className="lg:col-span-1">
              <Card className="bg-slate-700/50 border-orange-700/20 sticky top-0">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Selecione uma Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="bg-slate-700/50 text-white [&_.rdp-cell]:text-white [&_.rdp-button]:text-white [&_.rdp-button_today]:bg-orange-600 [&_.rdp-button_selected]:bg-orange-600 [&_.rdp-button_selected]:text-white"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right: Week Details and Daily Movements */}
            <div className="lg:col-span-2 space-y-6">
              {/* Week Selector */}
              <Card className="bg-slate-700/50 border-orange-700/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <button
                      onClick={handlePreviousWeek}
                      className="p-1 hover:bg-slate-600 rounded transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5 text-gray-300" />
                    </button>
                    <span className="text-center flex-1 text-sm">{formatWeekRange()}</span>
                    <button
                      onClick={handleNextWeek}
                      className="p-1 hover:bg-slate-600 rounded transition-colors"
                    >
                      <ChevronRight className="h-5 w-5 text-gray-300" />
                    </button>
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Daily Movements */}
              <Card className="bg-slate-700/50 border-orange-700/20">
                <CardHeader>
                  <CardTitle className="text-white">Movimentações Diárias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.key} className="flex items-center justify-between gap-4">
                      <label className="text-sm font-medium text-gray-300 w-24">{day.label}</label>
                      <div className="flex-1">
                        <Input
                          type="number"
                          value={currentWeekMovement?.[day.key as keyof typeof currentWeekMovement] || 0}
                          onChange={(e) => handleDayChange(day.key, parseInt(e.target.value) || 0)}
                          className="bg-slate-600 border-slate-500 text-white"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Total Movement */}
              {currentWeekMovement && (
                <Card className="bg-orange-900/30 border-orange-700/50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 font-medium">Total da Semana:</span>
                      <span className="text-2xl font-bold text-orange-400">
                        {currentWeekMovement.totalMovement}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={() => onOpenChange(false)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
