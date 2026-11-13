import { useState, type ChangeEvent } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PHOTO_BUCKET, photoUrl, resizeToJpeg } from '../lib/photo';

export default function PhotoUploader({ studentId, photoPath, onDone }: { studentId: string; photoPath: string | null; onDone: (path: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const url = photoUrl(photoPath);

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !supabase) return;
    if (!file.type.startsWith('image/')) { setErr('Escolha um arquivo de imagem.'); return; }
    setBusy(true); setErr('');
    try {
      const blob = await resizeToJpeg(file);
      const path = `${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600' });
      if (up.error) throw up.error;
      const upd = await supabase.from('students').update({ photo_path: path }).eq('id', studentId);
      if (upd.error) { await supabase.storage.from(PHOTO_BUCKET).remove([path]); throw upd.error; }
      if (photoPath) await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]);
      onDone(path);
    } catch (ex: any) {
      setErr('Não foi possível enviar a foto: ' + (ex?.message || 'erro desconhecido'));
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!supabase || !photoPath || !confirm('Remover a foto deste aluno?')) return;
    setBusy(true); setErr('');
    const upd = await supabase.from('students').update({ photo_path: null }).eq('id', studentId);
    if (upd.error) { setErr('Não foi possível remover: ' + upd.error.message); setBusy(false); return; }
    await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]);
    setBusy(false); onDone(null);
  }

  return (
    <div className="photoBox wide">
      <div className="photoPreview">{url ? <img src={url} alt="Foto do aluno" /> : <span>Sem foto</span>}</div>
      <div className="photoActions">
        <b>Foto da carteirinha</b>
        <small>Rosto de frente, fundo claro, sem óculos escuros ou boné. A foto é recortada em formato retrato e reduzida automaticamente.</small>
        <label className="primaryButton photoBtn">
          <Camera size={16} /> {busy ? 'Enviando…' : url ? 'Trocar foto' : 'Enviar / tirar foto'}
          <input type="file" accept="image/*" onChange={pick} disabled={busy} hidden />
        </label>
        {url && <button type="button" className="cancelButton photoBtn" onClick={remove} disabled={busy}><Trash2 size={14} /> Remover</button>}
        {err && <div className="error">{err}</div>}
      </div>
    </div>
  );
}
