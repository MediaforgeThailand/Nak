// Vector NRV brand mark (recreates the NRV / Next Rama V logo). Renders crisply
// at any badge size — a dark chip with white "NRV" and the red accent on the V.
// Swap this for the raster logo later by dropping the file in /public and using
// next/image here; every call site picks up the change automatically.
export function BrandMark({ size = 40, radius }: { size?: number; radius?: number }) {
  const r = radius ?? Math.round(size * 0.27);
  return (
    <span
      role="img"
      aria-label="NRV"
      style={{
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: r,
        background: "#111214",
        boxShadow: "0 8px 22px -10px rgba(0,0,0,.55)",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <svg width={size * 0.76} height={size * 0.42} viewBox="0 0 76 32" fill="none" aria-hidden="true">
        <text
          x="0"
          y="25"
          textLength="76"
          lengthAdjust="spacingAndGlyphs"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
          fontWeight={900}
          fontStyle="italic"
          fontSize="30"
          fill="#fff"
        >
          NR<tspan fill="#e11d2a">V</tspan>
        </text>
      </svg>
    </span>
  );
}
