export default function Background() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div className="grid-glow" />
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`floating-cap cap-${i + 1}`}><i /></span>
      ))}
      {Array.from({ length: 18 }, (_, i) => (
        <i key={i} className={`particle p-${i + 1}`} />
      ))}
    </div>
  );
}
