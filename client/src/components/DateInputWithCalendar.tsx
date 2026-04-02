import { useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function parseMaskedDate(value?: string) {
  if (!value || !/^\d{2}-\d{2}-\d{4}$/.test(value)) return undefined;

  const [day, month, year] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function toMaskedDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

interface DateInputWithCalendarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  calendarClassName?: string;
  disabled?: boolean;
}

export function DateInputWithCalendar({
  value,
  onChange,
  placeholder = "DD-MM-YYYY",
  className,
  calendarClassName,
  disabled,
}: DateInputWithCalendarProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => parseMaskedDate(value), [value]);

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="numeric"
        maxLength={10}
        value={value}
        onChange={e => onChange(formatDateInput(e.target.value))}
        placeholder={placeholder}
        className={cn("pr-10", className)}
        disabled={disabled}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Abrir calendário"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={date => {
              if (!date) return;
              onChange(toMaskedDate(date));
              setOpen(false);
            }}
            className={calendarClassName}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
