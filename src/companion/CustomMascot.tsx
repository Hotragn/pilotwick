import { motion } from "framer-motion";
import type { CompanionState } from "../integrations/types";
import type { CompanionProfile } from "../profiles/profileSchema";
import SpriteSheet from "./SpriteSheet";

/**
 * Renders a user-uploaded companion. Each state maps to a GIF/image or a
 * sprite sheet; states without an asset gracefully fall back to `idle`.
 */
export default function CustomMascot({
  state,
  profile,
}: {
  state: CompanionState;
  profile: CompanionProfile;
}) {
  const asset = profile.states[state as string] ?? profile.states["idle"];
  if (!asset) return null;

  return (
    <motion.div
      key={`${state}-${asset.kind}`}
      className="flex h-full w-full items-center justify-center"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      {asset.kind === "sprite" ? (
        <SpriteSheet asset={asset} maxSize={180} />
      ) : (
        <img
          src={asset.data}
          alt={`${profile.meta.name} — ${state}`}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
      )}
    </motion.div>
  );
}
