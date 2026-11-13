export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

/** Remove acentos, deixa maiúsculo e limita o tamanho (exigência do BR Code). */
const clean = (s: string, max: number) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().trim().slice(0, max);

export function normalizeKey(type: PixKeyType, key: string): string {
  const k = key.trim();
  switch (type) {
    case 'cpf': case 'cnpj': return k.replace(/\D/g, '');
    case 'phone': { const d = k.replace(/[^\d+]/g, ''); return d.startsWith('+') ? d : '+55' + d.replace(/\D/g, ''); }
    case 'email': return k.toLowerCase();
    default: return k;
  }
}

const tlv = (id: string, value: string) => id + String(value.length).padStart(2, '0') + value;

export function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Gera o "PIX copia e cola" estático (sem valor definido: quem paga digita o valor). */
export function pixPayload(opts: { type: PixKeyType; key: string; name: string; city: string }): string {
  const key = normalizeKey(opts.type, opts.key);
  const merchantInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', key);
  const body =
    tlv('00', '01') + tlv('26', merchantInfo) + tlv('52', '0000') + tlv('53', '986') + tlv('58', 'BR') +
    tlv('59', clean(opts.name, 25) || 'NA') + tlv('60', clean(opts.city, 15) || 'SAO PAULO') + tlv('62', tlv('05', '***')) + '6304';
  return body + crc16(body);
}
