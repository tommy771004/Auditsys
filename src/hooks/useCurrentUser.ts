import { useEffect, useState } from "react";

export interface UserProfile {
  id: number;
  username: string;
  isAdmin: boolean;
  subscriptionPlan: "free" | "pro" | "enterprise";
  createdAt: string;
}

export function useCurrentUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem("auth_token");

  const fetchProfile = async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("auth_token");
        }
        throw new Error("Failed to load user profile");
      }

      const data = await res.json();
      setUser(data.user);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  return {
    user,
    loading,
    error,
    refreshUser: fetchProfile,
  };
}
