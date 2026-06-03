/**
 * Base API Client wrapper using native fetch.
 * Handles auth token injection, cookie auth, error parsing, and base URLs.
 */

const RAW_API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "";

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.replace(/\/$/, "");
  if (!trimmed) return "/api/v1";
  if (/\/api(?:\/v1)?$/.test(trimmed)) return trimmed;
  return `${trimmed}/api/v1`;
}

const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

/**
 * Get JWT token from local storage.
 * Supports both token keys used across the app while the auth flow is being unified.
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gharpayy.access_token") ?? localStorage.getItem("gharpayy_auth_token");
}

async function fetchClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const token = getAuthToken();
  const defaultHeaders: HeadersInit = {
    Accept: "application/json",
  };

  if (!(customConfig.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...customConfig,
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => null);

    if (response.ok) {
      return data as T;
    }

    if (response.status === 401) {
      // Trigger logout / redirect logic
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("gharpayy:unauthorized"));
      }
    }

    throw new ApiError(
      response.status,
      data?.message || response.statusText || "API Error",
      data
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, error instanceof Error ? error.message : "Network Error");
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    fetchClient<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    }),
  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    }),
  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    fetchClient<T>(endpoint, { ...options, method: "DELETE" }),
};
