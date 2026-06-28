import { IconClose } from '../icons';

/* Box ricerca per nome (#4.7a) — input controllato riusabile in tutti i
   contesti classifica/storico. Stato `value` nel contenitore (effimero, NON
   nello store). Stile via CSS. */
interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function FiltroNome({ value, onChange, placeholder = 'Cerca giocatore…' }: Props) {
  return (
    <div className="cla-search">
      <input
        className="cla-search-input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Cerca giocatore"
      />
      {value && (
        <button className="cla-search-clear" onClick={() => onChange('')} aria-label="Pulisci ricerca">
          <IconClose size={16} />
        </button>
      )}
    </div>
  );
}
