import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { DateInputWithCalendar } from "@/components/DateInputWithCalendar";

const ADD_DEPARTMENT_VALUE = "__add_new_department__";

interface MaintenanceInlineEditProps {
  value: string;
  field:
    | "title"
    | "department"
    | "requestDate"
    | "type"
    | "priority"
    | "status";
  onSave: (newValue: string) => void;
  isLoading?: boolean;
  children: React.ReactNode;
  departmentOptions?: string[];
  onAddDepartmentOption?: (department: string) => boolean;
}

export function MaintenanceInlineEdit({
  value,
  field,
  onSave,
  isLoading = false,
  children,
  departmentOptions = [],
  onAddDepartmentOption,
}: MaintenanceInlineEditProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue !== value && editValue.trim()) {
      onSave(editValue);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsAddingDepartment(false);
    setNewDepartmentName("");
    setIsOpen(false);
  };

  const handleAddDepartment = () => {
    const department = newDepartmentName.trim();

    if (!department) {
      toast.error("Digite o nome do departamento");
      return;
    }

    if (
      departmentOptions.some(
        option => option.toLowerCase() === department.toLowerCase()
      )
    ) {
      toast.error("Esse departamento já existe na lista");
      return;
    }

    const wasAdded = onAddDepartmentOption?.(department);
    if (wasAdded === false) {
      return;
    }

    setEditValue(department);
    setNewDepartmentName("");
    setIsAddingDepartment(false);
  };

  const getOptions = () => {
    switch (field) {
      case "type":
        return [
          { label: "Preventiva", value: "preventiva" },
          { label: "Corretiva", value: "correctiva" },
        ];
      case "priority":
        return [
          { label: "Baixa", value: "baixa" },
          { label: "Média", value: "media" },
          { label: "Alta", value: "alta" },
          { label: "Urgente", value: "urgente" },
        ];
      case "status":
        return [
          { label: "Aberto", value: "aberto" },
          { label: "Em Progresso", value: "em_progresso" },
          { label: "Concluído", value: "concluido" },
          { label: "Cancelado", value: "cancelado" },
        ];
      default:
        return [];
    }
  };

  const renderInput = () => {
    if (field === "title") {
      return (
        <Input
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          placeholder="Digite o novo título"
          className="bg-slate-700 border-slate-600 text-white"
          autoFocus
        />
      );
    }

    if (field === "department") {
      return (
        <div className="space-y-2">
          <Select
            value={editValue || undefined}
            onValueChange={selected => {
              if (selected === ADD_DEPARTMENT_VALUE) {
                setIsAddingDepartment(true);
                return;
              }

              setEditValue(selected);
              setIsAddingDepartment(false);
            }}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Selecione um departamento" />
            </SelectTrigger>
            <SelectContent>
              {departmentOptions.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
              <SelectItem value={ADD_DEPARTMENT_VALUE}>
                + Adicionar novo departamento
              </SelectItem>
            </SelectContent>
          </Select>

          {isAddingDepartment && (
            <div className="flex flex-col gap-2">
              <Input
                value={newDepartmentName}
                onChange={e => setNewDepartmentName(e.target.value)}
                placeholder="Novo departamento"
                className="bg-slate-700 border-slate-600 text-white"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddDepartment}
                className="bg-sky-600 hover:bg-sky-700"
              >
                Adicionar departamento
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (field === "requestDate") {
      return (
        <DateInputWithCalendar
          value={editValue}
          onChange={setEditValue}
          placeholder="DD-MM-YYYY"
          className="bg-slate-700 border-slate-600 text-white"
          calendarClassName="[&_.rdp-cell]:text-white [&_.rdp-button]:text-white [&_.rdp-button_today]:bg-sky-600 [&_.rdp-button_selected]:bg-sky-600 [&_.rdp-button_selected]:text-white"
        />
      );
    }

    const options = getOptions();
    return (
      <Select value={editValue} onValueChange={setEditValue}>
        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="hover:opacity-80 transition-opacity cursor-pointer">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-slate-800 border-slate-700 p-4">
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-300">
            Editar{" "}
            {field === "title"
              ? "Título"
              : field === "department"
                ? "Departamento"
                : field === "requestDate"
                  ? "Data do chamado"
                  : field === "type"
                    ? "Tipo"
                    : field === "priority"
                      ? "Prioridade"
                      : "Status"}
          </div>
          {renderInput()}
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading || editValue === value}
              className="bg-sky-600 hover:bg-sky-700"
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
