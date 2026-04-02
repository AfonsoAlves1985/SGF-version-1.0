import { trpc } from "@/lib/trpc";

export function useAuth() {
  const { data: user, isLoading, error } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: Infinity,
  });

  const token = localStorage.getItem("auth-token");
  const isAuthenticated = !!token && !!user;

  const logout = () => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("manus-runtime-user-info");
    window.location.href = "/login";
  };

  return {
    user: isAuthenticated ? user : null,
    loading: isLoading,
    error,
    isAuthenticated,
    refresh: () => Promise.resolve(),
    logout,
  };
}