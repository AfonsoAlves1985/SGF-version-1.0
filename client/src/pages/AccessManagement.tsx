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
import { Copy, Loader2, ShieldCheck, UserCog, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
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
  const utils = trpc.useUtils();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleValue>("viewer");
  const [latestInvitationLink, setLatestInvitationLink] = useState("");
  const [latestInvitationEmail, setLatestInvitationEmail] = useState("");

  const usersQuery = trpc.accessManagement.listUsers.useQuery(undefined, {
    enabled: isOwner,
  });
  const invitationsQuery = trpc.accessManagement.listInvitations.useQuery(
    undefined,
    {
      enabled: isOwner,
    }
  );

  const inviteMutation = trpc.accessManagement.inviteUser.useMutation({
    onSuccess: data => {
      setLatestInvitationLink(data.invitationLink);
      setLatestInvitationEmail(data.email);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("viewer");

      if (data.emailSent) {
        toast.success("Convite enviado por e-mail com sucesso");
      } else {
        toast.warning(
          data.emailError
            ? `Convite criado, mas o e-mail não foi enviado (${data.emailError}). Use o link manual.`
            : "Convite criado, mas o e-mail não foi enviado. Use o link manual."
        );
      }

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

  const pendingInvitations = useMemo(() => {
    return (invitationsQuery.data || []).filter(
      (invitation: any) => invitation.status === "pending"
    );
  }, [invitationsQuery.data]);

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">
          Administração de Acessos
        </h1>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-8">
            <p className="text-gray-300">
              Apenas usuários owner podem acessar esta tela.
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
          Convide usuários por e-mail e gerencie permissões do workspace.
        </p>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar novo usuário
          </CardTitle>
          <CardDescription className="text-gray-300">
            O usuário recebe um link para definir a própria senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <Label className="text-gray-300">E-mail</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={event => setInviteEmail(event.target.value)}
                placeholder="usuario@empresa.com"
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
              if (!inviteEmail.trim()) {
                toast.error("Informe o e-mail do convite");
                return;
              }

              inviteMutation.mutate({
                email: inviteEmail.trim().toLowerCase(),
                name: inviteName.trim() || undefined,
                role: inviteRole,
                baseUrl: window.location.origin,
              });
            }}
            disabled={inviteMutation.isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {inviteMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Enviar convite
          </Button>

          {latestInvitationLink && (
            <div className="rounded-md border border-orange-700/40 bg-orange-900/20 p-3">
              <p className="text-sm text-orange-200 mb-2">
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
                <Button
                  type="button"
                  onClick={() => {
                    const subject = encodeURIComponent(
                      "Convite de acesso ao SGF"
                    );
                    const body = encodeURIComponent(
                      `Olá!\n\nVocê recebeu um convite para acessar o SGF.\nUse este link para ativar sua conta:\n${latestInvitationLink}\n\nEste link expira em 72 horas.`
                    );
                    window.location.href = `mailto:${latestInvitationEmail}?subject=${subject}&body=${body}`;
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Enviar por e-mail
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usersQuery.data || []).map((row: any) => {
                  const disabled =
                    updateRoleMutation.isPending ||
                    updateActiveMutation.isPending;
                  const isOwnerRow = row.role === "superadmin";

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
            Convites pendentes podem ser revogados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-300">E-mail</TableHead>
                  <TableHead className="text-gray-300">Papel</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Expira em</TableHead>
                  <TableHead className="text-gray-300">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation: any) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="text-white">
                      {invitation.email}
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-gray-300 hover:bg-slate-700"
                        disabled={revokeInviteMutation.isPending}
                        onClick={() =>
                          revokeInviteMutation.mutate({
                            invitationId: invitation.id,
                          })
                        }
                      >
                        Revogar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
