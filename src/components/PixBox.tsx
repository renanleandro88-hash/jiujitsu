import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { normalizeKey, pixPayload, type PixKeyType } from '../lib/pix';

type Cfg = { pix_key_type: PixKeyType; pix_key: string; beneficiary_name: string; beneficiary_city: string; instructions: string | null };
const TYPE_LABEL: Record<string, string> = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', phone: 'Telefone', random: 'Chave aleatória' };

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
    const ok = document.execCommand('copy'); t.remove(); return ok;
  }
}

export default function PixBox() {
  const [cfg, setCfg] = useState<Cfg | null | undefined>(undefined);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!supabase) { setCfg(null); return; }
    supabase.from('payment_settings').select('pix_key_type,pix_key,beneficiary_name,beneficiary_city,instructions').eq('active', true).limit(1).maybeSingle()
      .then(({ data }) => setCfg((data as Cfg) || null));
  }, []);

  if (cfg === undefined) return null;
  if (!cfg) return <p>Os dados para contribuição serão publicados em breve.</p>;

  const key = normalizeKey(cfg.pix_key_type, cfg.pix_key);
  const payload = pixPayload({ type: cfg.pix_key_type, key: cfg.pix_key, name: cfg.beneficiary_name, city: cfg.beneficiary_city });
  const doCopy = async (what: string, text: string) => { if (await copy(text)) { setCopied(what); setTimeout(() => setCopied(''), 2000); } };

  return (
    <div className="pixBox">
      <div className="pixQr"><QRCodeSVG value={payload} size={150} bgColor="#ffffff" fgColor="#111111" /></div>
      <div className="pixInfo">
        <small>PIX · {TYPE_LABEL[cfg.pix_key_type]}</small>
        <b className="pixKey">{key}</b>
        <span>Favorecido: {cfg.beneficiary_name}</span>
        <div className="pixButtons">
          <button type="button" className="outlineButton" onClick={() => doCopy('key', key)}>{copied === 'key' ? <Check size={14} /> : <Copy size={14} />}&nbsp;{copied === 'key' ? 'Copiado!' : 'Copiar chave'}</button>
          <button type="button" className="outlineButton" onClick={() => doCopy('code', payload)}>{copied === 'code' ? <Check size={14} /> : <Copy size={14} />}&nbsp;{copied === 'code' ? 'Copiado!' : 'Pix copia e cola'}</button>
        </div>
        {cfg.instructions && <p className="pixNote">{cfg.instructions}</p>}
        <p className="pixNote">Aponte a câmera do app do seu banco para o QR Code e informe o valor. Confira o nome do favorecido antes de confirmar.</p>
      </div>
    </div>
  );
}
