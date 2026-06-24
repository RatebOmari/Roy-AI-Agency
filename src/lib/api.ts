import { authStorage } from "./auth";
import type { ApiError } from "@/types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

// Called by AuthContext to enable clean React-state logout on 401
let _onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(cb: () => void) {
  _onUnauthorized = cb;
}

// Set by AgencyClientContext when an agency is acting on behalf of a client
let _clientId: string | null = null;
export function setClientId(id: string | null) { _clientId = id; }

class ApiClient {
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (_clientId) {
      headers["x-client-id"] = _clientId;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      // Send httpOnly session cookie automatically; required for cookie-based auth
      credentials: "include",
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
      // On 401, clear local state and redirect to login — unless demo mode
      // (demo mode has no real cookie, so 401s are expected on all API calls)
      if (res.status === 401 && !authStorage.isDemoMode()) {
        authStorage.clear();
        _onUnauthorized?.();
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

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient();
