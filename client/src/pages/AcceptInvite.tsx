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
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function getInviteToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") || "";
}

export default function AcceptInvite() {
  const token = useMemo(() => getInviteToken(), []);
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const inviteQuery = trpc.accessManagement.getInvitationByToken.useQuery(
    { token },
    {
      enabled: Boolean(token),
      retry: false,
    }
  );

  const acceptMutation = trpc.accessManagement.acceptInvitation.useMutation({
    onSuccess: () => {
      toast.success("Convite aceito com sucesso. Faça login para continuar.");
      setLocation("/login");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Convite inválido</CardTitle>
            <CardDescription className="text-gray-300">
              O link não possui token de convite.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Aceitar convite</CardTitle>
          <CardDescription className="text-gray-300">
            Defina seu nome e senha para ativar o acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inviteQuery.isLoading ? (
            <div className="text-gray-300 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando convite...
            </div>
          ) : inviteQuery.error ? (
            <p className="text-red-400">{inviteQuery.error.message}</p>
          ) : (
            <>
              <div className="rounded-md border border-slate-700 bg-slate-800 p-3 text-sm text-gray-300">
                <p>
                  <strong className="text-white">E-mail:</strong>{" "}
                  {inviteQuery.data?.email}
                </p>
                <p>
                  <strong className="text-white">Permissão:</strong>{" "}
                  {inviteQuery.data?.role}
                </p>
                <p>
                  <strong className="text-white">Expira em:</strong>{" "}
                  {inviteQuery.data?.expiresAt
                    ? new Date(inviteQuery.data.expiresAt).toLocaleDateString(
                        "pt-BR"
                      )
                    : "-"}
                </p>
              </div>

              <div>
                <Label className="text-gray-300">Nome</Label>
                <Input
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <Label className="text-gray-300">Senha</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  placeholder="Crie uma senha forte"
                />
              </div>

              <Button
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={acceptMutation.isPending}
                onClick={() => {
                  if (!name.trim()) {
                    toast.error("Informe seu nome");
                    return;
                  }

                  if (!password.trim()) {
                    toast.error("Informe sua senha");
                    return;
                  }

                  acceptMutation.mutate({
                    token,
                    name: name.trim(),
                    password,
                  });
                }}
              >
                {acceptMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Ativar acesso
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
