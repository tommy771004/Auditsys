export default function MeshBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[var(--surface)]">
      {/* Grid pattern only - no glow orbs */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-80" />
    </div>
  );
}
