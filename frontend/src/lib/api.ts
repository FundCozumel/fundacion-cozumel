import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/**
 * Cliente HTTP para el backend FastAPI.
 * Adjunta el JWT de la sesión de Supabase en el header Authorization,
 * de modo que el backend aplique las políticas RLS del usuario.
 */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    throw new ApiError(401, "Sesión no válida. Inicia sesión de nuevo.");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Respuesta no-JSON (p. ej. página de error HTML de un servidor equivocado)
    if (!res.ok) {
      throw new ApiError(res.status, `Error ${res.status} al llamar al servidor`);
    }
    throw new ApiError(res.status, "Respuesta inesperada del servidor (no es JSON).");
  }

  if (!res.ok) {
    const d = data as { detail?: unknown; message?: unknown } | null;
    const detail = (d && (d.detail ?? d.message)) || `Error ${res.status} al llamar al servidor`;
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  /** Construye un querystring ignorando valores vacíos/undefined. */
  qs: (params: Record<string, string | number | boolean | null | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== "") sp.set(k, String(v));
    }
    const s = sp.toString();
    return s ? `?${s}` : "";
  },
};
