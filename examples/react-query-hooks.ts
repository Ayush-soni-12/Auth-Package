import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import api from "../api/api";
import { useEffect } from "react";

export const useCheckAuth = () => {
  return useQuery({
    queryKey: ["auth", "check"],
    queryFn: async () => {
      // eslint-disable-next-line no-useless-catch
      try {
        // withCredentials: true automatically sends cookies
        const response = await api.get("/check-auth");

        return response.data;
      } catch (error: unknown) {
        // We DO NOT clear localStorage on 401 here because if the user is in the 
        // middle of OTP verification, they don't have a cookie yet, and clearing 
        // localStorage will delete the ID they need to submit the OTP!
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSignupMutation = () => {
  // const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      username: string;
      email: string;
      password: string;
      confirmPassword: string;
      terms: boolean;
    }) => {
      const response = await api.post("/signup", data);
      return response.data;
    },
    onSuccess: (data) => {
      // queryClient.invalidateQueries({ queryKey: ["user"] });
      if (data.user) {
        localStorage.setItem("id", data.user._id);
        localStorage.setItem("email", data.user.email);
      }
    },
  });
};

export const useVerifyOtpMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { otp: string }) => {
      const id = localStorage.getItem("id");
      const response = await api.post(`/verifyLoginOtp/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("id", data.user._id);
        localStorage.setItem("email", data.user.email);
      }
      queryClient.invalidateQueries({ queryKey: ["auth", "check"] });
    },
  });
};

export const useResendOtpMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const id = localStorage.getItem("id");
      const response = await api.post(`/resendOtp/${id}`);
      return response.data;
    },
  });
};

// Login mutation
export const useLoginMutation = () => {
  // const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await api.post("/login", data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("id", data.user._id || data.userId);
        localStorage.setItem("email", data.user.email);
      } else if (data.userId) {
        localStorage.setItem("id", data.userId);
      }
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post("/logout");
    },
    onSuccess: () => {
      // Clear all storage
      localStorage.clear()

      // Clear all queries
      queryClient.clear();
    },
    onError: () => {
      // Even if API fails, clear frontend

      localStorage.clear();
      queryClient.clear();
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await api.post("/forgotPassword", data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("id", data.user._id);
        localStorage.setItem("email", data.user.email);
        localStorage.setItem("resetToken", data.resetToken);
      }
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (data: { id: string; token: string; password: string }) => {
      const response = await api.post(`resetPassword/${data.id}/${data.token}`, { password: data.password });
      return response.data;
    },
    onSuccess: () => {
      localStorage.removeItem("resetToken");
    },
  });
};






export function useGoogleAuth() {
  const queryClient = useQueryClient();

  const { mutate } = useMutation({
    mutationFn: async (token: string) => {
      const res = await api.post("google", { token });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("id", data.user._id || data.userId);
        localStorage.setItem("email", data.user.email);
      }
      
      // Invalidate the auth check query to refetch user data
      queryClient.invalidateQueries({ queryKey: ["auth", "check"] });
      
      // Redirect to dashboard
      window.location.href = "/dashboard";
    },
    onError: (error) => {
      console.error("Google authentication failed:", error);
    },
  });

  useEffect(() => {
    if (!window.google) return;

    google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (response) => {
        mutate(response.credential);
      },
    });

    google.accounts.id.renderButton(
      document.getElementById("google-btn")!,
      { theme: "outline", size: "large" }
    );
  }, [mutate]);
}
