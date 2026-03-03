/**
 * Typed API client for the NestJS backend.
 * Uses fetch() with bearer token from Supabase session.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

async function getToken(): Promise<string | null> {
    const { createClient } = await import('./supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

async function request<T>(
    path: string,
    options: RequestInit = {},
    requireAuth = true,
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (requireAuth) {
        const token = await getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(body.message || `API error ${res.status}`);
    }

    return res.json();
}

export const api = {
    get: <T>(path: string, auth = true) =>
        request<T>(path, { method: 'GET' }, auth),

    post: <T>(path: string, body: unknown, auth = true) =>
        request<T>(path, { method: 'POST', body: JSON.stringify(body) }, auth),

    patch: <T>(path: string, body: unknown, auth = true) =>
        request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, auth),

    delete: <T>(path: string, auth = true) =>
        request<T>(path, { method: 'DELETE' }, auth),
};
