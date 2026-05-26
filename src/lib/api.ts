import { authStorage } from "./auth";
import type { ApiError } from "@/types";

const BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL ?? "";

// Called by AuthContext to enable clean React-state logout on 401
let _onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(cb: () => void) {
  _onUnauthorized = cb;
}

class ApiClient {
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = authStorage.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let err: ApiError = { message: "Request failed", status: res.status };
      try {
        const body = await res.json();
        err.message = body.message ?? err.message;
        err.code = body.code;
      } catch {
        // ignore parse errors
      }
      if (res.status === 401) {
        const currentToken = authStorage.getToken();
        if (!currentToken?.startsWith("demo_token_")) {
          authStorage.clear();
          // Notify React context to update state (no hard reload)
          _onUnauthorized?.();
        }
      }
      throw err;
    }

    return res.json() as Promise<T>;
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: "GET" });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient();
