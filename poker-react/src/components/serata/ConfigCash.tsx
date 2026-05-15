interface Props {
  buyIn: number;
  onChange: (v: number) => void;
}

export default function ConfigCash({ buyIn, onChange }: Props) {
  return (
    <div className="form-row form-row--top form-row--compact">
      <label>Buy-in (€)</label>
      <input
        type="number"
        value={buyIn}
        step={0.5}
        min={0}
        inputMode="decimal"
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
      />
      <p className="help-note">
        Considerato come "soldi versati" all'ingresso di ogni giocatore in partita.
      </p>
    </div>
  );
}
