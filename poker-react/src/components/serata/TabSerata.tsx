/* Le partite attive sono accessibili dal FAB basso-sinistra.
   Il tab "Nuova partita" apre direttamente l'overlay di setup. */
export default function TabSerata() {
  return (
    <div className="tab-content">
      <div className="empty">
        <div className="eico">🃏</div>
        <p>Usa il pulsante <strong>Nuova partita</strong> in basso per iniziare una serata.</p>
        <p>Se hai partite in corso, trovi il pulsante in basso a sinistra.</p>
      </div>
    </div>
  );
}
