/** The shared SVG texture is cached; only its outer layers move, without a JS loop. */
export function WaterBackground({ contained = false }: { contained?: boolean }) {
  return <div aria-hidden="true" className={`water-background${contained ? ' water-background--contained' : ''}`}>
    <div className="water-wash" />
    <div className="water-current" />
    <div className="water-current water-current--undertow" />
    <div className="water-frost" />
  </div>;
}
