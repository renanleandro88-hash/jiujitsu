/** Gera o PDF da carteirinha (2 páginas: frente e emergência) no próprio navegador, sem bibliotecas. */
export type PdfAct = {
  name: string; belt?: string | null; degrees?: number | null;
  teachers?: string[] | null; schedule?: { weekday: string | null; start: string | null; end: string | null }[] | null;
};
export type CardPdfData = {
  name: string; number: string; expires: string; photoUrl: string | null; activities: PdfAct[];
  academy: string; link: string; qrSvg: string | null;
  emergency: { blood: string | null; sus: string | null; rg: string | null; address: string | null; allergies: string | null; health: string | null; contacts: { name: string; relationship: string | null; phone: string }[] };
};

const W = 1080, H = 1530;
const COLORS: [string, string][] = [['branca', '#f4f4f4'], ['cinza', '#9a9a9a'], ['amarela', '#f2c823'], ['laranja', '#f08a24'], ['verde', '#2e9e4f'], ['azul', '#1f5fbf'], ['roxa', '#7a3db5'], ['marrom', '#7a4a21'], ['preta', '#161616'], ['vermelha', '#c62828'], ['crua', '#e8dcc0'], ['bege', '#e8dcc0'], ['rosa', '#e86aa6'], ['dourada', '#c9a227']];
const beltColors = (b?: string | null) => { const t = (b || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); return COLORS.filter(([n]) => t.includes(n.slice(0, 5))).map(c => c[1]); };
const FONT = 'Helvetica, Arial, sans-serif';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('img')); i.src = src; });
}
async function imageFromUrl(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null;
  try { const b = await (await fetch(url)).blob(); const u = URL.createObjectURL(b); const i = await loadImage(u); return i; } catch { return null; }
}
async function qrImage(svg: string | null): Promise<HTMLImageElement | null> {
  if (!svg) return null;
  try { return await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)); } catch { return null; }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, draw = true): number {
  const words = text.split(/\s+/); let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { if (draw) ctx.fillText(line, x, y); y += lh; line = w; } else line = t;
  }
  if (line) { if (draw) ctx.fillText(line, x, y); y += lh; }
  return y;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function newPage(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#f3e7c2'); g.addColorStop(0.5, '#e9d79b'); g.addColorStop(1, '#cfe3c8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#b89449'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
  return [c, ctx];
}
function header(ctx: CanvasRenderingContext2D, color: string, title: string, sub: string, logo: HTMLImageElement | null, badge: string) {
  ctx.fillStyle = color; ctx.fillRect(0, 0, W, 170);
  ctx.fillStyle = '#fff'; rr(ctx, 40, 30, 110, 110, 14); ctx.fill();
  if (logo) { const s = Math.min(100 / logo.width, 100 / logo.height); ctx.drawImage(logo, 45 + (100 - logo.width * s) / 2, 35 + (100 - logo.height * s) / 2, logo.width * s, logo.height * s); }
  ctx.fillStyle = '#fff'; ctx.font = `bold 46px ${FONT}`; ctx.fillText(title, 176, 88);
  ctx.font = `26px ${FONT}`; ctx.fillText(sub, 176, 128);
  ctx.font = `bold 28px ${FONT}`; const bw = ctx.measureText(badge).width + 44; ctx.fillStyle = '#fff'; rr(ctx, W - 40 - bw, 60, bw, 54, 27); ctx.fill();
  ctx.fillStyle = color; ctx.fillText(badge, W - 40 - bw + 22, 98);
}
function label(ctx: CanvasRenderingContext2D, t: string, x: number, y: number) { ctx.fillStyle = '#6b5322'; ctx.font = `24px ${FONT}`; ctx.fillText(t, x, y); }
function drawQr(ctx: CanvasRenderingContext2D, qr: HTMLImageElement | null, x: number, y: number, s: number) {
  ctx.fillStyle = '#fff'; rr(ctx, x - 14, y - 14, s + 28, s + 28, 14); ctx.fill();
  if (qr) ctx.drawImage(qr, x, y, s, s);
}

function front(d: CardPdfData, logo: HTMLImageElement | null, photo: HTMLImageElement | null, qr: HTMLImageElement | null): HTMLCanvasElement {
  const [c, ctx] = newPage();
  header(ctx, '#1b6b3a', 'INSTITUTO REALIZA', 'CARTEIRA DO ALUNO · PROJETO SOCIAL', logo, 'VÁLIDA');
  ctx.fillStyle = '#ddd'; rr(ctx, 40, 210, 280, 372, 14); ctx.fill();
  if (photo) {
    ctx.save(); rr(ctx, 40, 210, 280, 372, 14); ctx.clip();
    const s = Math.max(280 / photo.width, 372 / photo.height); ctx.drawImage(photo, 40 + (280 - photo.width * s) / 2, 210 + (372 - photo.height * s) / 2, photo.width * s, photo.height * s); ctx.restore();
  } else { ctx.fillStyle = '#777'; ctx.font = `28px ${FONT}`; ctx.fillText('Sem foto', 110, 400); }
  ctx.strokeStyle = '#8d6d32'; ctx.lineWidth = 4; rr(ctx, 40, 210, 280, 372, 14); ctx.stroke();
  label(ctx, 'NOME', 352, 244); ctx.fillStyle = '#13150f'; ctx.font = `bold 50px ${FONT}`; const ny = wrap(ctx, d.name.toUpperCase(), 352, 296, 690, 56);
  const y2 = Math.max(ny + 10, 380);
  label(ctx, 'MATRÍCULA', 352, y2); ctx.fillStyle = '#13150f'; ctx.font = `bold 46px Courier New, monospace`; ctx.fillText(d.number, 352, y2 + 52);
  label(ctx, 'VALIDADE', 352, y2 + 108); ctx.fillStyle = '#13150f'; ctx.font = `bold 46px ${FONT}`; ctx.fillText(d.expires, 352, y2 + 160);

  let y = 620;
  for (const a of d.activities.slice(0, 3)) {
    const sched = (a.schedule || []).map(s => `${s.weekday ? s.weekday.slice(0, 3) : ''} ${s.start || ''}${s.end ? '–' + s.end : ''}`.trim()).join(' · ');
    const teach = (a.teachers || []).join(', ');
    ctx.font = `30px ${FONT}`;
    const h = 62 + 56 + (teach ? 44 : 0) + (sched ? 44 : 0) + 20;
    ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(ctx, 40, y, 1000, h, 16); ctx.fill(); ctx.strokeStyle = 'rgba(184,148,73,.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#13150f'; ctx.font = `bold 38px ${FONT}`; ctx.fillText(a.name, 64, y + 48);
    let yy = y + 66;
    const cols = beltColors(a.belt);
    if (cols.length) {
      const bw = 900; ctx.save(); rr(ctx, 64, yy, bw, 30, 5); ctx.clip();
      cols.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(64 + (bw - 120) * i / cols.length, yy, (bw - 120) / cols.length + 1, 30); });
      ctx.fillStyle = '#111'; ctx.fillRect(64 + bw - 120, yy, 120, 30);
      ctx.fillStyle = '#fff'; for (let i = 0; i < Math.min(a.degrees || 0, 4); i++) ctx.fillRect(64 + bw - 100 + i * 26, yy, 10, 30);
      ctx.restore(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; rr(ctx, 64, yy, bw, 30, 5); ctx.stroke(); yy += 44;
    } else yy += 6;
    ctx.fillStyle = '#2a3a1a'; ctx.font = `bold 32px ${FONT}`;
    ctx.fillText(a.belt ? `${a.belt}${a.degrees ? ` · ${a.degrees}º grau` : ''}` : 'Sem graduação registrada', 64, yy + 20); yy += 46;
    ctx.font = `28px ${FONT}`;
    if (teach) { ctx.fillStyle = '#6b5322'; ctx.fillText('Professor(es):', 64, yy + 14); const lw = ctx.measureText('Professor(es): ').width; ctx.fillStyle = '#13150f'; ctx.fillText(teach, 64 + lw, yy + 14); yy += 44; }
    if (sched) { ctx.fillStyle = '#6b5322'; ctx.fillText('Horário:', 64, yy + 14); const lw = ctx.measureText('Horário: ').width; ctx.fillStyle = '#13150f'; ctx.fillText(sched, 64 + lw, yy + 14); yy += 44; }
    y += h + 18;
  }
  ctx.fillStyle = '#13150f'; ctx.font = `bold 28px ${FONT}`; ctx.fillText('Local de treino:', 40, Math.max(y + 24, 1170));
  ctx.font = `28px ${FONT}`; wrap(ctx, d.academy, 40, Math.max(y + 24, 1170) + 40, 1000, 36);
  ctx.fillStyle = '#13150f'; ctx.fillRect(0, 1300, W, 230);
  drawQr(ctx, qr, 800, 1330, 170);
  ctx.fillStyle = '#f0d99e'; ctx.font = `bold 32px ${FONT}`; ctx.fillText('Confirme a autenticidade pelo QR code', 40, 1370);
  ctx.font = `24px ${FONT}`; ctx.fillStyle = '#d8cfae'; let lk = d.link.replace(/^https?:\/\//, ''); while (ctx.measureText(lk).width > 700 && lk.length > 10) lk = lk.slice(0, -2); ctx.fillText(lk === d.link.replace(/^https?:\/\//, '') ? lk : lk + '…', 40, 1420);
  return c;
}

function back(d: CardPdfData, logo: HTMLImageElement | null, qr: HTMLImageElement | null): HTMLCanvasElement {
  const [c, ctx] = newPage(); const e = d.emergency;
  header(ctx, '#a31616', 'FICHA DE EMERGÊNCIA', 'INSTITUTO REALIZA · PROJETO SOCIAL', logo, 'SAMU 192');
  ctx.fillStyle = '#13150f'; ctx.font = `bold 50px ${FONT}`; let y = wrap(ctx, d.name.toUpperCase(), 40, 250, 1000, 56);
  ctx.font = `30px ${FONT}`; ctx.fillStyle = '#6b5322'; ctx.fillText(`Matrícula ${d.number}`, 40, y + 4); y += 60;
  label(ctx, 'TIPO SANGUÍNEO', 40, y); ctx.fillStyle = '#a31616'; ctx.font = `bold 90px ${FONT}`; ctx.fillText(e.blood || 'Não informado', 40, y + 90); y += 150;
  label(ctx, 'CONTATOS PARA LIGAR', 40, y); y += 20;
  const cs = e.contacts.length ? e.contacts : [{ name: 'Não informado', relationship: null, phone: '' }];
  for (const ct of cs.slice(0, 4)) {
    ctx.fillStyle = '#a31616'; rr(ctx, 40, y, 1000, 78, 12); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold 36px ${FONT}`;
    ctx.fillText(`${ct.name}${ct.relationship ? ' (' + ct.relationship + ')' : ''}  ${ct.phone}`, 62, y + 52); y += 94;
  }
  y += 14;
  const rows: [string, string][] = [['ALERGIAS', e.allergies || 'Nenhuma informada'], ['SAÚDE / MEDICAÇÃO / OBSERVAÇÕES', e.health || 'Nada informado'], ['CARTÃO SUS', e.sus || 'Não informado'], ['RG', e.rg || 'Não informado'], ['ENDEREÇO DO ALUNO', e.address || 'Não informado']];
  for (const [l, v] of rows) { label(ctx, l, 40, y); ctx.fillStyle = '#13150f'; ctx.font = `bold 36px ${FONT}`; y = wrap(ctx, v, 40, y + 44, 1000, 44) + 22; }
  ctx.fillStyle = '#13150f'; ctx.fillRect(0, 1360, W, 170);
  drawQr(ctx, qr, 880, 1375, 120);
  ctx.fillStyle = '#f0d99e'; ctx.font = `bold 30px ${FONT}`; ctx.fillText('Em caso de acidente, ligue 192 (SAMU).', 40, 1425);
  ctx.font = `24px ${FONT}`; ctx.fillStyle = '#d8cfae'; ctx.fillText('Documento pessoal: não compartilhe com desconhecidos.', 40, 1470);
  return c;
}

function jpeg(c: HTMLCanvasElement): Uint8Array {
  const bin = atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

/** Monta um PDF simples (1 imagem JPEG por página). */
export function pdfFromJpegs(pages: { bytes: Uint8Array; w: number; h: number }[], ptW = 540, ptH = 765): Blob {
  const enc = new TextEncoder(); const parts: Uint8Array[] = []; const offsets: number[] = []; let len = 0;
  const push = (x: string | Uint8Array) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (n: number, body: string | (() => void)) => { offsets[n] = len; push(`${n} 0 obj\n`); if (typeof body === 'string') push(body); else body(); push('\nendobj\n'); };
  push('%PDF-1.4\n');
  const total = 2 + pages.length * 3;
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  pages.forEach((p, i) => {
    const pn = 3 + i * 3, cn = pn + 1, im = pn + 2;
    obj(pn, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${cn} 0 R >>`);
    const cs = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
    obj(cn, `<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
    obj(im, () => { push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`); push(p.bytes); push('\nendstream'); });
  });
  const xref = len;
  push(`xref\n0 ${total + 1}\n0000000000 65535 f \n`);
  for (let n = 1; n <= total; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

export async function buildCardPdf(d: CardPdfData): Promise<Blob> {
  const [logo, photo, qr] = await Promise.all([imageFromUrl('/logo/logo.png'), imageFromUrl(d.photoUrl), qrImage(d.qrSvg)]);
  const pages = [front(d, logo, photo, qr), back(d, logo, qr)].map(c => ({ bytes: jpeg(c), w: c.width, h: c.height }));
  return pdfFromJpegs(pages);
}
