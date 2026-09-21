import { useEffect, useState } from "react";
import type { SpriteAsset } from "../profiles/profileSchema";

/**
 * Plays a sprite sheet by stepping `background-position`.
 * Frames run left→right, wrapping every `columns` frames (a single-row strip
 * is just `columns = frames`).
 */
export default function SpriteSheet({
  asset,
  maxSize,
}: {
  asset: SpriteAsset;
  maxSize: number;
}) {
  const [frame, setFrame] = useState(0);
  const { frameWidth, frameHeight, frames, fps, columns } = asset;
  const cols = Math.max(1, columns || frames);

  useEffect(() => {
    setFrame(0);
    const id = setInterval(
      () => setFrame((f) => (f + 1) % Math.max(1, frames)),
      1000 / Math.max(1, fps)
    );
    return () => clearInterval(id);
  }, [asset.data, frames, fps]);

  const col = frame % cols;
  const row = Math.floor(frame / cols);
  const scale = Math.min(maxSize / frameWidth, maxSize / frameHeight, 4);

  return (
    <div
      className="pixelated"
      style={{
        width: frameWidth,
        height: frameHeight,
        backgroundImage: `url(${asset.data})`,
        backgroundPosition: `-${col * frameWidth}px -${row * frameHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: "center",
      }}
    />
  );
}
