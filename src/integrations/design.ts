import type { Integration } from "./types";

export const design: Integration = {
  id: "design",
  name: "Design Mode",
  priority: 8,
  state: "designing",
  matches: (ctx) =>
    /figma|photoshop|illustrator|canva|blender|krita|gimp|affinity|inkscape|aseprite/i.test(
      `${ctx.app} ${ctx.title}`
    ),
  label: () => "Designing 🎨",
  apps: ["Figma", "Photoshop", "Illustrator", "Canva", "Blender", "Aseprite"],
};
