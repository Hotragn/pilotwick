import { motion, type Variants } from "framer-motion";

/**
 * The shared renderer for the pixel mascots.
 *
 * The mascots used to be drawn as bare coloured squares, which is what made
 * them read as flat and unfinished. Three cheap passes fix most of that
 * without anyone redrawing a single sprite:
 *
 *  1. a **contact shadow** on the ground, so the pet sits on your desktop
 *     instead of floating over it — the single biggest perceived-quality win;
 *  2. a soft **drop shadow**, which separates the pet from whatever is behind
 *     it without the heavy cut-out halo a hard 1px ring produces — that ring
 *     doubled the visual weight of thin details like whiskers;
 *  3. **directional shading**, lightening the top edge of the silhouette and
 *     darkening the bottom so the body reads as rounded.
 *
 * Doing it in the renderer rather than the art means every pixel mascot —
 * and any future one — gets it for free.
 */

/** Blend a hex colour toward white (amount > 0) or black (amount < 0). */
function shift(hex: string, amount: number): string {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const mix = (c: number) =>
    Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount))
      .toString(16)
      .padStart(2, "0");
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

const TOP_LIGHT = 0.16;
const BOTTOM_SHADE = -0.22;

export interface PixelStageProps {
  /** Rows of single-character palette keys; "." is transparent. */
  rows: string[];
  palette: Record<string, string>;
  /** Grid width in cells (rows may be ragged). */
  width: number;
  /** Palette keys that should not be shaded — eyes, accessories, props. */
  flat?: ReadonlySet<string>;
  /**
   * Optional hard 1px ring. Off by default: on sprites with thin details it
   * reads as a sticker cut-out rather than a rim light.
   */
  outline?: string | null;
  /** 0 hides the ground shadow; 1 is the default size. */
  shadow?: number;
  variants?: Variants;
  animate?: string;
}

export default function PixelStage({
  rows,
  palette,
  width,
  flat,
  outline = null,
  shadow = 1,
  variants,
  animate,
}: PixelStageProps) {
  const height = rows.length;
  const filled = (x: number, y: number) =>
    y >= 0 && y < height && x >= 0 && x < width && (rows[y]?.[x] ?? ".") !== ".";

  const cells: { x: number; y: number; fill: string }[] = [];
  const ring = new Set<string>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y]?.[x] ?? ".";
      if (ch === ".") continue;

      const base = palette[ch] ?? palette.B ?? "#2e2428";
      let fill = base;
      if (!flat?.has(ch)) {
        // Only the silhouette's own edges get shaded, so interior detail
        // (eyes, markings) keeps its intended colour.
        if (!filled(x, y - 1)) fill = shift(base, TOP_LIGHT);
        else if (!filled(x, y + 1)) fill = shift(base, BOTTOM_SHADE);
      }
      cells.push({ x, y, fill });

      if (outline) {
        // Stamp the four neighbours; anything still empty becomes the ring.
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          if (!filled(x + dx, y + dy)) ring.add(`${x + dx},${y + dy}`);
        }
      }
    }
  }

  // One cell of padding so the ring is never clipped by the viewBox.
  const pad = 1;

  return (
    <motion.svg
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2 + 1.2}`}
      className="h-full w-full drop-shadow-[0_4px_7px_rgba(0,0,0,0.5)]"
      shapeRendering="crispEdges"
      variants={variants}
      animate={animate}
    >
      {shadow > 0 && (
        <ellipse
          cx={width / 2}
          cy={height + 0.55}
          rx={(width / 2.9) * shadow}
          ry={0.75 * shadow}
          fill="rgba(0,0,0,0.38)"
        />
      )}

      {outline &&
        [...ring].map((key) => {
          const [x, y] = key.split(",").map(Number);
          return <rect key={`o${key}`} x={x} y={y} width="1" height="1" fill={outline} />;
        })}

      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width="1" height="1" fill={c.fill} />
      ))}
    </motion.svg>
  );
}
