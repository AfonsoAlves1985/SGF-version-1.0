import { trpc } from "@/lib/trpc";

export function useAuth() {
  const token = localStorage.getItem("auth-token");

  const {
    data: user,
    isLoading,
    error,
  } = trpc.auth.me.useQuery(undefined, {
    enabled: !!token,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const isAuthenticated = !!token && !!user;

  const logout = () => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("manus-runtime-user-info");
    window.dispatchEvent(new Event("auth-token-changed"));
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
