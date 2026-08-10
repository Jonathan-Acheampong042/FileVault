export default function Card({ label, value, icon = null }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/60">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-primary">{value}</p>
      </div>
      {icon && <div className="rounded-lg bg-accent p-2.5 text-secondary">{icon}</div>}
    </div>
  );
}
