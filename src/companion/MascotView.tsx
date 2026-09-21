import type { CompanionState } from "../integrations/types";
import type { CompanionProfile } from "../profiles/profileSchema";
import type { BuiltinMascot } from "../profiles/mascotChoice";
import PixelCat from "./PixelCat";
import PixelDog from "./PixelDog";
import EmberDragon from "./EmberDragon";
import MochiCat from "./MochiCat";
import CustomMascot from "./CustomMascot";

/**
 * Renders whichever mascot is selected. Both the live overlay and the
 * Studio's preview stage go through here, so a mascot added to this switch
 * is instantly previewable in settings — no second registration step.
 */
export default function MascotView({
  mascot,
  state,
  profile,
}: {
  mascot: BuiltinMascot;
  state: CompanionState;
  profile?: CompanionProfile | null;
}) {
  // The pixel mascots draw their own contact shadow inside the sprite grid;
  // the vector and uploaded ones need one added, or they look pasted on top
  // of the desktop instead of standing on it.
  if (mascot === "dog") return <PixelDog state={state} />;
  if (mascot === "pixel" || (mascot === "custom" && !profile)) return <PixelCat state={state} />;

  return (
    <div className="relative h-full w-full">
      <Grounded />
      {mascot === "custom" && profile ? (
        <CustomMascot state={state} profile={profile} />
      ) : mascot === "dragon" ? (
        <EmberDragon state={state} />
      ) : (
        <MochiCat state={state} />
      )}
    </div>
  );
}

/** A soft ellipse on the ground plane, behind whatever stands on it. */
function Grounded() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-[3%] left-1/2 h-[6%] w-[46%] -translate-x-1/2 rounded-[50%]"
      style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.42), rgba(0,0,0,0) 72%)" }}
    />
  );
}

export interface MascotInfo {
  id: BuiltinMascot;
  name: string;
  tagline: string;
  /** Shown as the card's accent so the gallery reads at a glance. */
  accent: string;
}

export const BUILTIN_MASCOTS: MascotInfo[] = [
  { id: "pixel", name: "Pixel", tagline: "Pixel-art cat · the classic", accent: "#f491b2" },
  { id: "dog", name: "Biscuit", tagline: "Pixel-art dog · floppy ears", accent: "#ffb703" },
  { id: "mochi", name: "Mochi", tagline: "Soft vector cat · squishy", accent: "#a78bfa" },
  { id: "dragon", name: "Ember", tagline: "Holographic dragon", accent: "#2dd4bf" },
];
