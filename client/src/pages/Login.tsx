import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { motion } from "framer-motion";

const neuralNodes = [
  { id: 0, x: 8, y: 28 },
  { id: 1, x: 14, y: 18 },
  { id: 2, x: 18, y: 35 },
  { id: 3, x: 14, y: 52 },
  { id: 4, x: 20, y: 64 },
  { id: 5, x: 29, y: 22 },
  { id: 6, x: 32, y: 40 },
  { id: 7, x: 30, y: 58 },
  { id: 8, x: 39, y: 30 },
  { id: 9, x: 42, y: 48 },
  { id: 10, x: 50, y: 40 },
  { id: 11, x: 58, y: 28 },
  { id: 12, x: 61, y: 46 },
  { id: 13, x: 59, y: 64 },
  { id: 14, x: 68, y: 22 },
  { id: 15, x: 71, y: 38 },
  { id: 16, x: 74, y: 56 },
  { id: 17, x: 82, y: 30 },
  { id: 18, x: 85, y: 46 },
  { id: 19, x: 80, y: 64 },
  { id: 20, x: 50, y: 56 },
  { id: 21, x: 24, y: 44 },
  { id: 22, x: 76, y: 44 },
];

const neuralLinks = [
  [0, 1],
  [1, 5],
  [5, 8],
  [8, 10],
  [1, 2],
  [2, 21],
  [21, 6],
  [1, 4],
  [2, 3],
  [3, 4],
  [3, 21],
  [2, 6],
  [6, 7],
  [7, 4],
  [6, 9],
  [7, 9],
  [8, 9],
  [6, 10],
  [9, 10],
  [9, 20],
  [7, 20],
  [20, 10],
  [10, 11],
  [10, 12],
  [10, 15],
  [11, 14],
  [14, 15],
  [15, 22],
  [22, 16],
  [22, 12],
  [11, 12],
  [12, 13],
  [12, 15],
  [12, 16],
  [20, 12],
  [20, 13],
  [14, 17],
  [17, 18],
  [15, 18],
  [16, 18],
  [16, 19],
  [18, 19],
  [11, 8],
  [12, 9],
] as const;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteLogin, setInviteLogin] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [showUser, setShowUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useLocation();
  const [successMessage, setSuccessMessage] = useState("");
  const utils = trpc.useUtils();
  const inviteToken = useMemo(() => {
    const tokenFromSearch = new URLSearchParams(window.location.search).get(
      "inviteToken"
    );

    if (tokenFromSearch) {
      return tokenFromSearch;
    }

    const queryString = location.includes("?")
      ? location.split("?")[1] || ""
      : "";

    return new URLSearchParams(queryString).get("inviteToken") || "";
  }, [location]);
  const isInviteFlow = Boolean(inviteToken);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async data => {
      localStorage.setItem("auth-token", data.token);
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(data.user)
      );
      window.dispatchEvent(new Event("auth-token-changed"));
      await utils.auth.me.invalidate();
      setLocation("/");
    },
    onError: err => {
      setError(err.message);
    },
  });

  const invitationQuery = trpc.accessManagement.getInvitationByToken.useQuery(
    { token: inviteToken },
    {
      enabled: isInviteFlow,
      retry: false,
    }
  );

  const acceptInviteMutation =
    trpc.accessManagement.acceptInvitation.useMutation({
      onSuccess: (_data, variables) => {
        setError("");
        setSuccessMessage("Cadastro concluído. Faça login para acessar.");
        setEmail(variables.login);
        setInvitePassword("");
        window.history.replaceState({}, "", "/login");
        setLocation("/login");
      },
      onError: err => {
        setError(err.message);
      },
    });

  useEffect(() => {
    if (isInviteFlow && invitationQuery.data?.name && !inviteName) {
      setInviteName(invitationQuery.data.name);
    }
  }, [invitationQuery.data, inviteName, isInviteFlow]);

  useEffect(() => {
    if (isInviteFlow && invitationQuery.data?.email && !inviteLogin) {
      setInviteLogin(invitationQuery.data.email.toLowerCase());
    }
  }, [invitationQuery.data, inviteLogin, isInviteFlow]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    loginMutation.mutate({ email, password });
  };

  const handleAcceptInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!inviteName.trim()) {
      setError("Informe seu nome para continuar");
      return;
    }

    if (!invitePassword.trim()) {
      setError("Informe uma senha");
      return;
    }

    if (!inviteLogin.trim()) {
      setError("Informe um login para continuar");
      return;
    }

    acceptInviteMutation.mutate({
      token: inviteToken,
      login: inviteLogin.trim().toLowerCase(),
      name: inviteName.trim(),
      password: invitePassword,
    });
  };

  const isPending = loginMutation.isPending;
  const isBusy = isInviteFlow
    ? invitationQuery.isLoading || acceptInviteMutation.isPending
    : isPending;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg
          className="absolute inset-0 h-full w-full opacity-50"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {neuralLinks.map(([from, to], index) => {
            const start = neuralNodes[from];
            const end = neuralNodes[to];

            return (
              <g key={`link-${from}-${to}`}>
                <motion.line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="rgb(34 211 238)"
                  strokeWidth="0.2"
                  initial={{ opacity: 0.15 }}
                  animate={{ opacity: [0.15, 0.6, 0.15] }}
                  transition={{
                    duration: 3.8,
                    repeat: Infinity,
                    delay: index * 0.18,
                  }}
                />
                <motion.circle
                  r="0.45"
                  fill="rgb(125 249 255)"
                  animate={{
                    cx: [start.x, end.x],
                    cy: [start.y, end.y],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: isBusy ? 1.15 : 2.2,
                    repeat: Infinity,
                    ease: "linear",
                    delay: index * 0.22,
                  }}
                />
              </g>
            );
          })}

          {neuralNodes.map((node, index) => (
            <g key={`node-${node.id}`}>
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="0.7"
                fill="rgb(34 211 238)"
                initial={{ opacity: 0.45 }}
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  delay: index * 0.16,
                }}
              />
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="1.4"
                fill="rgb(34 211 238)"
                animate={{ opacity: [0, 0.3, 0], r: [1.1, 2, 1.1] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  delay: index * 0.14,
                }}
              />
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="0.35"
                fill="rgb(207 250 254)"
                animate={{ opacity: [0, 0, 1, 0], r: [0.2, 0.2, 1.1, 0.2] }}
                transition={{
                  duration: isBusy ? 0.95 : 1.7,
                  repeat: Infinity,
                  delay: index * 0.11,
                }}
              />
            </g>
          ))}
        </svg>

        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900/95 p-8 shadow-2xl"
      >
        <h1 className="text-xl font-bold text-white mb-1 text-center leading-tight">
          Sistema de Gestão de Facilities SGF
        </h1>
        <p className="text-sm text-zinc-400 mb-5 text-center">
          {isInviteFlow ? "Cadastro por convite" : "Login"}
        </p>

        <div className="mb-5 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <motion.span
              className="h-2 w-2 rounded-full bg-cyan-400"
              animate={isBusy ? { opacity: [0.35, 1, 0.35] } : { opacity: 1 }}
              transition={
                isBusy ? { duration: 1, repeat: Infinity } : { duration: 0 }
              }
            />
            <span>
              {isInviteFlow
                ? invitationQuery.isLoading
                  ? "Validando convite"
                  : acceptInviteMutation.isPending
                    ? "Ativando acesso"
                    : "Convite pronto para ativação"
                : isPending
                  ? "Conectando e validando login"
                  : "Conexão pronta para autenticação"}
            </span>
          </div>
        </div>

        {isInviteFlow ? (
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            {invitationQuery.isLoading ? (
              <p className="text-zinc-300 text-sm">
                Carregando dados do convite...
              </p>
            ) : invitationQuery.error ? (
              <div className="space-y-3">
                <p className="text-red-400 text-sm">
                  {invitationQuery.error.message}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    window.history.replaceState({}, "", "/login");
                    setLocation("/login");
                  }}
                  className="w-full rounded bg-zinc-700 py-2 text-white hover:bg-zinc-600"
                >
                  Voltar para login
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                  <p>
                    <strong className="text-white">Login sugerido:</strong>{" "}
                    {invitationQuery.data?.email || "Definido no cadastro"}
                  </p>
                  <p>
                    <strong className="text-white">Permissão:</strong>{" "}
                    {invitationQuery.data?.role}
                  </p>
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm mb-1">
                    Login
                  </label>
                  <input
                    type="text"
                    value={inviteLogin}
                    onChange={e => setInviteLogin(e.target.value)}
                    className="w-full rounded bg-zinc-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Seu login"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    className="w-full rounded bg-zinc-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm mb-1">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showInvitePassword ? "text" : "password"}
                      value={invitePassword}
                      onChange={e => setInvitePassword(e.target.value)}
                      className="w-full rounded bg-zinc-800 px-4 py-2 pr-11 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="Crie uma senha forte"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInvitePassword(current => !current)}
                      className={`absolute inset-y-0 right-0 px-3 transition-colors ${
                        showInvitePassword
                          ? "text-cyan-400 hover:text-cyan-300"
                          : "text-zinc-300 hover:text-white"
                      }`}
                      aria-label={
                        showInvitePassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {showInvitePassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}
                {successMessage && (
                  <p className="text-emerald-400 text-sm">{successMessage}</p>
                )}

                <button
                  type="submit"
                  disabled={acceptInviteMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded bg-cyan-600 py-2 text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
                >
                  {acceptInviteMutation.isPending ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    "Ativar acesso"
                  )}
                </button>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-sm mb-1">
                Usuário
              </label>
              <div className="relative">
                <input
                  type={showUser ? "text" : "password"}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded bg-zinc-800 px-4 py-2 pr-11 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="******"
                />
                <button
                  type="button"
                  onClick={() => setShowUser(current => !current)}
                  className={`absolute inset-y-0 right-0 px-3 transition-colors ${
                    showUser
                      ? "text-cyan-400 hover:text-cyan-300"
                      : "text-zinc-300 hover:text-white"
                  }`}
                  aria-label={showUser ? "Ocultar usuário" : "Mostrar usuário"}
                >
                  {showUser ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-sm mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded bg-zinc-800 px-4 py-2 pr-11 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="******"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(current => !current)}
                  className={`absolute inset-y-0 right-0 px-3 transition-colors ${
                    showPassword
                      ? "text-cyan-400 hover:text-cyan-300"
                      : "text-zinc-300 hover:text-white"
                  }`}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {successMessage && (
              <p className="text-emerald-400 text-sm">{successMessage}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded bg-cyan-600 py-2 text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  Conectando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
