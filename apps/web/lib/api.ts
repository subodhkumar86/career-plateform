// Use the same-origin Vercel function in production. A full URL can still be
// supplied for local development or a separately hosted API.
const API = process.env.NEXT_PUBLIC_API_URL || "/api";

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("career_token") || "";
}

export function hasToken() {
  return Boolean(getToken());
}

export function saveToken(token: string) {
  localStorage.setItem("career_token", token);
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("career_token");
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}
