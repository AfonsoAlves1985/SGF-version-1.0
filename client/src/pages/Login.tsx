import { useState } from "react";
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
  const [showUser, setShowUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };

  const isPending = loginMutation.isPending;

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
                    duration: isPending ? 1.15 : 2.2,
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
                  duration: isPending ? 0.95 : 1.7,
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
        <p className="text-sm text-zinc-400 mb-5 text-center">Login</p>

        <div className="mb-5 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <motion.span
              className="h-2 w-2 rounded-full bg-cyan-400"
              animate={
                isPending ? { opacity: [0.35, 1, 0.35] } : { opacity: 1 }
              }
              transition={
                isPending ? { duration: 1, repeat: Infinity } : { duration: 0 }
              }
            />
            <span>
              {isPending
                ? "Conectando e validando login"
                : "Conexão pronta para autenticação"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-sm mb-1">Usuário</label>
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
      </motion.div>
    </div>
  );
}
