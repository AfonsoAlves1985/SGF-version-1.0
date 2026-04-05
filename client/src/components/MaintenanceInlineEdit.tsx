import { useState } from "react";
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
}

const formatDateMask = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
};

export function MaintenanceInlineEdit({
  value,
  field,
  onSave,
  isLoading = false,
  children,
}: MaintenanceInlineEditProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (editValue !== value && editValue.trim()) {
      onSave(editValue);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsOpen(false);
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
    if (field === "title" || field === "department") {
      return (
        <Input
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          placeholder={
            field === "title" ? "Digite o novo título" : "Digite o departamento"
          }
          className="bg-slate-700 border-slate-600 text-white"
          autoFocus
        />
      );
    }

    if (field === "requestDate") {
      return (
        <Input
          type="text"
          inputMode="numeric"
          maxLength={10}
          value={editValue}
          onChange={e => setEditValue(formatDateMask(e.target.value))}
          placeholder="DD-MM-YYYY"
          className="bg-slate-700 border-slate-600 text-white"
          autoFocus
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
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
