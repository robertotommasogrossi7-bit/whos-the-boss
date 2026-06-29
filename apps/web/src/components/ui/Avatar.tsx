/* Avatar — cerchio con foto o iniziale del nome (DESIGN_SPEC §3). */

interface Props {
  nome?: string;
  foto?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Avatar({ nome = '', foto, size = 'md' }: Props) {
  const iniziale = nome.trim().charAt(0).toUpperCase() || '?';
  const cls = `ui-avatar${size !== 'md' ? ` ui-avatar--${size}` : ''}`;
  return (
    <span className={cls}>
      {foto ? <img src={foto} alt={nome} /> : iniziale}
    </span>
  );
}
