import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface Space {
  id: number;
  name: string;
  description?: string;
  location?: string;
}

export interface SpaceManagerProps {
  spaces: Space[];
  selectedSpace: number | null;
  onSelectSpace: (spaceId: number) => void;
  onCreateSpace: (data: {
    name: string;
    description?: string;
    location?: string;
  }) => void;
  onUpdateSpace: (
    id: number,
    data: { name: string; description?: string; location?: string }
  ) => void;
  onDeleteSpace: (id: number) => void;
  isLoading?: boolean;
  showHeader?: boolean;
  headerTitle?: string;
  headerDescription?: string;
  buttonLabel?: string;
}

export function SpaceManager({
  spaces,
  selectedSpace,
  onSelectSpace,
  onCreateSpace,
  onUpdateSpace,
  onDeleteSpace,
  isLoading = false,
  showHeader = true,
  headerTitle = "Selecione uma Unidade",
  headerDescription = "Escolha uma unidade para gerenciar",
  buttonLabel = "Nova Unidade",
}: SpaceManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
  });

  const handleOpenDialog = (space?: Space) => {
    if (space) {
      setEditingId(space.id);
      setFormData({
        name: space.name,
        description: space.description || "",
        location: space.location || "",
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", description: "", location: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nome da unidade é obrigatório");
      return;
    }

    if (editingId) {
      onUpdateSpace(editingId, formData);
    } else {
      onCreateSpace(formData);
    }

    setFormData({ name: "", description: "", location: "" });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleDelete = (spaceId: number) => {
    if (
      window.confirm(
        "Tem certeza que deseja deletar esta unidade? Todos os dados associados serão removidos."
      )
    ) {
      onDeleteSpace(spaceId);
    }
  };

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{headerTitle}</h2>
            <p className="text-sm text-gray-400 mt-1">{headerDescription}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenDialog()}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                {buttonLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingId ? "Editar" : "Nova"} Unidade
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Defina os dados da unidade para organizar os registros.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Nome *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="Ex: Febracis, Lead Fit"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Descrição
                  </label>
                  <Input
                    value={formData.description}
                    onChange={e =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="Descrição da unidade"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Localização
                  </label>
                  <Input
                    value={formData.location}
                    onChange={e =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="Ex: Av. Paulista, 1000"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-sky-600 hover:bg-sky-700"
                    disabled={isLoading}
                  >
                    {editingId ? "Atualizar" : "Criar"} Unidade
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingId(null);
                      setFormData({ name: "", description: "", location: "" });
                    }}
                    className="border-slate-600 text-gray-300 hover:bg-slate-800"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {spaces.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-400">
              <p>Nenhuma unidade criada ainda.</p>
              <p className="text-sm mt-2">
                Clique em "{buttonLabel}" para começar.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map(space => (
            <div
              key={space.id}
              onClick={() => onSelectSpace(space.id)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer group ${
                selectedSpace === space.id
                  ? "border-sky-600 bg-slate-700 bg-opacity-70"
                  : "border-slate-600 bg-slate-700/50 hover:border-sky-600 hover:bg-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">
                    {space.name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {space.description || "Sem descrição"}
                  </p>
                  {space.location && (
                    <p className="text-xs text-gray-500 mt-2">
                      {space.location}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleOpenDialog(space);
                    }}
                    className="p-1.5 hover:bg-blue-600/30 rounded transition-colors"
                    title="Editar unidade"
                  >
                    <Edit2 className="h-4 w-4 text-blue-400" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(space.id);
                    }}
                    className="p-1.5 hover:bg-red-600/30 rounded transition-colors"
                    title="Deletar unidade"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
