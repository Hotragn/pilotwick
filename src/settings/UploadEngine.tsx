import { useRef, useState } from "react";
import type { STATE_INFO, SpriteAsset, StateAsset } from "../profiles/profileSchema";
import { fileToDataUrl } from "../profiles/profileManager";
import SpriteSheet from "../companion/SpriteSheet";

type StateInfo = (typeof STATE_INFO)[number];

/**
 * The Upload Engine: one card per companion state. Drop in a GIF/PNG/WebP,
 * or flip it to sprite-sheet mode and dial in frame size / count / fps with
 * a live preview.
 */
export default function StateUploadCard({
  info,
  asset,
  onChange,
}: {
  info: StateInfo;
  asset: StateAsset | null;
  onChange: (asset: StateAsset | null) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const acceptFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const data = await fileToDataUrl(file);
    // GIFs animate on their own; everything else starts as a static image
    // that the user can promote to a sprite sheet.
    onChange({ kind: "gif", data });
  };

  const toSprite = async (data: string) => {
    const img = new Image();
    img.src = data;
    await img.decode().catch(() => {});
    // Sensible defaults: assume a horizontal strip of square frames.
    const frameHeight = img.naturalHeight || 32;
    const frames = Math.max(1, Math.round((img.naturalWidth || 32) / frameHeight));
    onChange({
      kind: "sprite",
      data,
      frameWidth: Math.round((img.naturalWidth || 32) / frames),
      frameHeight,
      frames,
      fps: 8,
      columns: frames,
    });
  };

  const patchSprite = (patch: Partial<SpriteAsset>) => {
    if (asset?.kind === "sprite") onChange({ ...asset, ...patch });
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        dragOver ? "border-teal-400 bg-teal-950/30" : "border-slate-800 bg-slate-900/60"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) acceptFile(file);
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold">
          {info.emoji} {info.name}
          {info.required && <span className="ml-1 text-teal-400">*</span>}
        </p>
        {asset && (
          <button onClick={() => onChange(null)} className="text-xs text-red-400 hover:text-red-300">
            remove
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-slate-500">{info.hint}</p>

      {/* Preview / drop zone */}
      <div className="mb-3 flex h-28 items-center justify-center overflow-hidden rounded-lg bg-slate-950/80">
        {asset ? (
          asset.kind === "sprite" ? (
            <SpriteSheet asset={asset} maxSize={100} />
          ) : (
            <img src={asset.data} alt={info.name} className="max-h-full max-w-full object-contain" />
          )
        ) : (
          <button
            onClick={() => fileInput.current?.click()}
            className="text-xs text-slate-500 hover:text-teal-300"
          >
            Drop a GIF / PNG here, or click to browse
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => fileInput.current?.click()}
          className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold hover:bg-slate-800"
        >
          {asset ? "Replace" : "Upload"}
        </button>
        {asset?.kind === "gif" && (
          <button
            onClick={() => toSprite(asset.data)}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold hover:bg-slate-800"
          >
            Treat as sprite sheet
          </button>
        )}
      </div>

      {/* Sprite sheet tuning */}
      {asset?.kind === "sprite" && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {(
            [
              ["W", "frameWidth"],
              ["H", "frameHeight"],
              ["Frames", "frames"],
              ["FPS", "fps"],
              ["Cols", "columns"],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="block">
              <span className="block text-[10px] uppercase text-slate-500">{label}</span>
              <input
                type="number"
                min={key === "columns" ? 0 : 1}
                value={asset[key] ?? 0}
                onChange={(e) => patchSprite({ [key]: Number(e.target.value) })}
                className="w-full rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-xs outline-none focus:border-teal-500"
              />
            </label>
          ))}
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/gif,image/png,image/webp,image/apng"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) acceptFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
