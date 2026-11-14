import { supabase } from './supabase';

/** Chama a função de servidor /api/admin-users (só administrador). */
export async function adminUsersApi(body: Record<string, unknown>): Promise<{ ok: boolean; data?: any; error?: string }> {
  if (!supabase) return { ok: false, error: 'Sistema não configurado.' };
  const { data: s } = await supabase.auth.getSession();
  const token = s.session?.access_token;
  if (!token) return { ok: false, error: 'Sessão expirada. Entre de novo.' };
  try {
    const r = await fetch('/api/admin-users', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j.error || 'Não foi possível concluir.' };
    return { ok: true, data: j };
  } catch {
    return { ok: false, error: 'Sem conexão com o servidor. Tente de novo.' };
  }
}
