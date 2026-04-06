import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface EditableCellProps {
  value: number | string;
  onSave: (value: number | string) => void;
  type?: "number" | "text";
  className?: string;
  displayFormat?: (value: number | string) => string;
}

export function EditableCell({
  value,
  onSave,
  type = "text",
  className = "",
  displayFormat,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    if (editValue !== String(value)) {
      const finalValue = type === "number" ? parseInt(editValue) || 0 : editValue;
      onSave(finalValue);
    }
    setIsEditing(false);
    setEditValue(String(value));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(String(value));
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-slate-700 border-sky-500 text-white ${className}`}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer px-2 py-1 rounded hover:bg-slate-700/50 transition-colors ${className}`}
    >
      {displayFormat ? displayFormat(value) : value}
    </div>
  );
}
