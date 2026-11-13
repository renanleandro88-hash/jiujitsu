import { supabase } from './supabase';

export const PHOTO_BUCKET = 'student-photos';

export function photoUrl(path: string | null | undefined): string | null {
  if (!path || !supabase) return null;
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* navegador antigo */ }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Imagem inválida')); i.src = url; });
  } finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
}

/** Recorta no formato retrato 3:4 (foco na parte de cima, onde fica o rosto) e reduz para JPEG leve. */
export async function resizeToJpeg(file: File, w = 480, h = 640): Promise<Blob> {
  const src = await loadBitmap(file);
  const sw0 = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const sh0 = 'naturalHeight' in src ? src.naturalHeight : src.height;
  const dstRatio = w / h;
  let sx = 0, sy = 0, sw = sw0, sh = sh0;
  if (sw0 / sh0 > dstRatio) { sw = sh0 * dstRatio; sx = (sw0 - sw) / 2; } else { sh = sw0 / dstRatio; sy = (sh0 - sh) * 0.25; }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Sem suporte a imagem neste navegador');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
  return await new Promise<Blob>((ok, no) => canvas.toBlob(b => (b ? ok(b) : no(new Error('Falha ao gerar a foto'))), 'image/jpeg', 0.85));
}

export const blobToDataUrl = (b: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(new Error('Falha ao ler a foto')); r.readAsDataURL(b); });
