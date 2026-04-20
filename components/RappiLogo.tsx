export function RappiLogo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block pb-3 ${className}`}
      style={{
        fontFamily: "var(--font-pacifico), cursive",
        letterSpacing: "-0.02em",
        color: "#ff441f",
        lineHeight: 1.25,
      }}
      aria-label="Rappi"
    >
      Rappi
    </span>
  );
}
