import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Activity = { id: string; name: string };

/** Lista pública de atividades ativas (id + nome). */
export function useActivities() {
  const [list, setList] = useState<Activity[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!supabase) { setLoaded(true); return; }
    supabase.from('activities').select('id,name').eq('active', true).order('sort_order').then(({ data }) => {
      setList((data as Activity[]) || []); setLoaded(true);
    });
  }, []);
  return { list, loaded };
}

/** Escolha de 1 ou 2 atividades (caixas de marcar). */
export default function ActivityChoice({ list, value, onChange }: { list: Activity[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter(x => x !== id));
    else if (value.length < 2) onChange([...value, id]);
  };
  if (list.length === 0) return <small>Nenhuma atividade disponível no momento.</small>;
  return (
    <div className="actChoices" role="group" aria-label="Atividades">
      {list.map(a => {
        const on = value.includes(a.id);
        return (
          <label key={a.id}>
            <input type="checkbox" checked={on} disabled={!on && value.length >= 2} onChange={() => toggle(a.id)} /> {a.name}
          </label>
        );
      })}
      <small>Escolha 1 ou 2 atividades ({value.length}/2).</small>
    </div>
  );
}
