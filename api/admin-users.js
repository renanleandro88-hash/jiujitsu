// Função de servidor (Vercel): só o ADMINISTRADOR consegue criar usuários e redefinir senhas.
// Precisa da variável SUPABASE_SERVICE_ROLE_KEY (chave secreta do Supabase) cadastrada na Vercel.
const URL_ = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ROLES = ['admin', 'teacher', 'assistant'];

const send = (res, code, body) => { res.status(code).setHeader('Cache-Control', 'no-store'); res.json(body); };
const hdr = (key, token) => ({ apikey: key, Authorization: `Bearer ${token || key}`, 'Content-Type': 'application/json' });

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método não permitido.' });
  if (!URL_ || !SERVICE) return send(res, 500, { error: 'Servidor sem configuração: cadastre SUPABASE_SERVICE_ROLE_KEY na Vercel e republique.' });

  // 1) quem está chamando? (token da sessão) e é administrador ativo?
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return send(res, 401, { error: 'Sessão ausente. Entre de novo.' });
  const who = await fetch(`${URL_}/auth/v1/user`, { headers: hdr(SERVICE, token) });
  if (!who.ok) return send(res, 401, { error: 'Sessão inválida. Entre de novo.' });
  const me = await who.json();
  const pr = await fetch(`${URL_}/rest/v1/profiles?id=eq.${encodeURIComponent(me.id)}&select=role,active`, { headers: hdr(SERVICE) });
  const prof = pr.ok ? (await pr.json())[0] : null;
  if (!prof || prof.role !== 'admin' || !prof.active) return send(res, 403, { error: 'Apenas o administrador pode fazer isso.' });

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  // 2) criar usuário
  if (b.action === 'create') {
    const email = String(b.email || '').trim().toLowerCase();
    const name = String(b.full_name || '').trim();
    const password = String(b.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: 'E-mail inválido.' });
    if (name.length < 2 || name.length > 120) return send(res, 400, { error: 'Informe o nome completo.' });
    if (password.length < 8) return send(res, 400, { error: 'A senha precisa ter pelo menos 8 caracteres.' });
    if (!ROLES.includes(b.role)) return send(res, 400, { error: 'Perfil inválido.' });

    const cu = await fetch(`${URL_}/auth/v1/admin/users`, { method: 'POST', headers: hdr(SERVICE), body: JSON.stringify({ email, password, email_confirm: true }) });
    const created = await cu.json().catch(() => ({}));
    if (!cu.ok || !created.id) {
      const exists = /already|registered|exists/i.test(JSON.stringify(created));
      return send(res, 400, { error: exists ? 'Já existe um usuário com este e-mail.' : (created.msg || created.message || 'Não foi possível criar o usuário.') });
    }
    const ip = await fetch(`${URL_}/rest/v1/profiles`, {
      method: 'POST', headers: { ...hdr(SERVICE), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: created.id, full_name: name, role: b.role, active: true, email }),
    });
    if (!ip.ok) {
      await fetch(`${URL_}/auth/v1/admin/users/${created.id}`, { method: 'DELETE', headers: hdr(SERVICE) });
      return send(res, 500, { error: 'Não foi possível gravar o perfil. Nada foi criado.' });
    }
    return send(res, 200, { id: created.id });
  }

  // 3) redefinir senha
  if (b.action === 'set_password') {
    const id = String(b.id || '');
    const password = String(b.password || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return send(res, 400, { error: 'Usuário inválido.' });
    if (password.length < 8) return send(res, 400, { error: 'A senha precisa ter pelo menos 8 caracteres.' });
    const up = await fetch(`${URL_}/auth/v1/admin/users/${id}`, { method: 'PUT', headers: hdr(SERVICE), body: JSON.stringify({ password }) });
    if (!up.ok) return send(res, 400, { error: 'Não foi possível trocar a senha.' });
    return send(res, 200, { ok: true });
  }

  return send(res, 400, { error: 'Ação desconhecida.' });
}
