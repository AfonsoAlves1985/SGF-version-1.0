import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { trpc } from "@/lib/trpc";
import {
  Copy,
  Loader2,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type RoleValue = "admin" | "editor" | "viewer";

const roleOptions: Array<{ value: RoleValue; label: string }> = [
  { value: "admin", label: "Administrador" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Visualizador" },
];

function roleLabel(role: string) {
  if (role === "superadmin") return "Owner";
  return roleOptions.find(option => option.value === role)?.label ?? role;
}

function invitationStatusLabel(status: string) {
  if (status === "pending") return "Pendente";
  if (status === "accepted") return "Aceito";
  if (status === "revoked") return "Revogado";
  if (status === "expired") return "Expirado";
  return status;
}

export default function AccessManagement() {
  const { user } = useAuth();
  const isOwner = user?.role === "superadmin";
  const canAccess = user?.role === "superadmin" || user?.role === "admin";
  const utils = trpc.useUtils();

  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleValue>("viewer");
  const [latestInvitationLink, setLatestInvitationLink] = useState("");

  const usersQuery = trpc.accessManagement.listUsers.useQuery(undefined, {
    enabled: canAccess,
  });
  const invitationsQuery = trpc.accessManagement.listInvitations.useQuery(
    undefined,
    {
      enabled: canAccess,
    }
  );

  const inviteMutation = trpc.accessManagement.inviteUser.useMutation({
    onSuccess: data => {
      setLatestInvitationLink(data.invitationLink);
      setInviteName("");
      setInviteRole("viewer");

      toast.success("Convite criado. Copie e envie o link manualmente.");

      invitationsQuery.refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const updateRoleMutation = trpc.accessManagement.updateUserRole.useMutation({
    onSuccess: async () => {
      toast.success("Permissão atualizada");
      await usersQuery.refetch();
      await utils.auth.me.invalidate();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const updateActiveMutation =
    trpc.accessManagement.updateUserActive.useMutation({
      onSuccess: async () => {
        toast.success("Status de acesso atualizado");
        await usersQuery.refetch();
      },
      onError: error => {
        toast.error(error.message);
      },
    });

  const revokeInviteMutation =
    trpc.accessManagement.revokeInvitation.useMutation({
      onSuccess: async () => {
        toast.success("Convite revogado");
        await invitationsQuery.refetch();
      },
      onError: error => {
        toast.error(error.message);
      },
    });

  const deleteUserMutation = trpc.accessManagement.deleteUser.useMutation({
    onSuccess: async () => {
      toast.success("Usuário excluído");
      await usersQuery.refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const deleteInvitationMutation =
    trpc.accessManagement.deleteInvitation.useMutation({
      onSuccess: async () => {
        toast.success("Convite excluído");
        await invitationsQuery.refetch();
      },
      onError: error => {
        toast.error(error.message);
      },
    });

  const invitations = invitationsQuery.data || [];

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">
          Administração de Acessos
        </h1>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-8">
            <p className="text-gray-300">
              Apenas usuários owner e administrador podem acessar esta tela.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Administração de Acessos
        </h1>
        <p className="text-gray-300">
          Convide usuários por link e gerencie permissões do workspace.
        </p>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar novo usuário
          </CardTitle>
          <CardDescription className="text-gray-300">
            Gere um link de convite para o usuário definir login e senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-1">
              <Label className="text-gray-300">Nome</Label>
              <Input
                value={inviteName}
                onChange={event => setInviteName(event.target.value)}
                placeholder="Nome do usuário"
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div className="sm:col-span-1">
              <Label className="text-gray-300">Permissão</Label>
              <Select
                value={inviteRole}
                onValueChange={value => setInviteRole(value as RoleValue)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => {
              inviteMutation.mutate({
                name: inviteName.trim() || undefined,
                role: inviteRole,
                baseUrl: window.location.origin,
              });
            }}
            disabled={inviteMutation.isPending}
            className="bg-sky-600 hover:bg-sky-700"
          >
            {inviteMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Gerar convite
          </Button>

          {latestInvitationLink && (
            <div className="rounded-md border border-sky-700/40 bg-sky-900/20 p-3">
              <p className="text-sm text-sky-200 mb-2">
                Link de convite gerado:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={latestInvitationLink}
                  readOnly
                  className="bg-slate-900 border-slate-600 text-gray-200"
                />
                <Button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(latestInvitationLink);
                    toast.success("Link copiado");
                  }}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Usuários e permissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-300">Nome</TableHead>
                  <TableHead className="text-gray-300">E-mail</TableHead>
                  <TableHead className="text-gray-300">Papel</TableHead>
                  <TableHead className="text-gray-300">Acesso</TableHead>
                  <TableHead className="text-gray-300">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usersQuery.data || []).map((row: any) => {
                  const disabled =
                    updateRoleMutation.isPending ||
                    updateActiveMutation.isPending ||
                    deleteUserMutation.isPending;
                  const isOwnerRow = row.role === "superadmin";
                  const canDeleteUser =
                    isOwner &&
                    !row.isActive &&
                    !isOwnerRow &&
                    row.id !== user?.id;

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-white">
                        {row.name || "-"}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {row.email || "-"}
                      </TableCell>
                      <TableCell>
                        {isOwnerRow ? (
                          <span className="inline-flex items-center gap-1 text-amber-300">
                            <ShieldCheck className="h-4 w-4" />
                            Owner
                          </span>
                        ) : (
                          <Select
                            value={row.role}
                            onValueChange={value =>
                              updateRoleMutation.mutate({
                                userId: row.id,
                                role: value as RoleValue,
                              })
                            }
                            disabled={disabled}
                          >
                            <SelectTrigger className="w-[170px] bg-slate-700 border-slate-600 text-white">
                              <SelectValue>{roleLabel(row.role)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.map(role => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={row.isActive ? "destructive" : "default"}
                          size="sm"
                          disabled={disabled || isOwnerRow}
                          onClick={() =>
                            updateActiveMutation.mutate({
                              userId: row.id,
                              isActive: !row.isActive,
                            })
                          }
                        >
                          {row.isActive ? "Desativar" : "Ativar"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {canDeleteUser ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/40 text-red-300 hover:bg-red-900/20"
                            disabled={disabled}
                            onClick={() =>
                              deleteUserMutation.mutate({
                                userId: row.id,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Convites enviados</CardTitle>
          <CardDescription className="text-gray-300">
            Convites pendentes podem ser revogados. Qualquer convite pode ser
            excluído.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-300">Login</TableHead>
                  <TableHead className="text-gray-300">Nome</TableHead>
                  <TableHead className="text-gray-300">Papel</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Expira em</TableHead>
                  <TableHead className="text-gray-300">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation: any) => {
                  const displayLogin = invitation.email?.endsWith("@invite.local")
                    ? "Definido no cadastro"
                    : invitation.email;

                  return (
                  <TableRow key={invitation.id}>
                    <TableCell className="text-white">
                      {displayLogin || "-"}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {invitation.name || "-"}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {roleLabel(invitation.role)}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {invitationStatusLabel(invitation.status)}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {new Date(invitation.expiresAt).toLocaleDateString(
                        "pt-BR"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {invitation.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-gray-300 hover:bg-slate-700"
                            disabled={
                              revokeInviteMutation.isPending ||
                              deleteInvitationMutation.isPending
                            }
                            onClick={() =>
                              revokeInviteMutation.mutate({
                                invitationId: invitation.id,
                              })
                            }
                          >
                            Revogar
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/40 text-red-300 hover:bg-red-900/20"
                          disabled={
                            revokeInviteMutation.isPending ||
                            deleteInvitationMutation.isPending
                          }
                          onClick={() =>
                            deleteInvitationMutation.mutate({
                              invitationId: invitation.id,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
