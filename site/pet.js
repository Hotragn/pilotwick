/**
 * The live companion on the landing page.
 *
 * This is the same sprite grid and the same state ladder the desktop app
 * runs, driven by the page instead of by the OS. The point is that the demo
 * is not a video of the product — it *is* the product, reacting to the
 * visitor in real time. No competitor can copy the page without building
 * the thing the page is advertising.
 *
 * Deliberately dependency-free and written straight to the DOM: one rAF
 * loop, no framework, no re-render cycle.
 */
(() => {
  "use strict";

  const W = 20;
  const PALETTE = {
    B: "#2e2428", E: "#2e2428", S: "#ffffff", P: "#f491b2",
    Y: "#ffd166", H: "#6d6875", g: "#dcd8da", G: "#b1abae", D: "#847e82",
  };
  const HOT = Object.assign({}, PALETTE, { B: "#93323c", E: "#93323c" });

  const SIT = [
    "....B..........B....", "....BB........BB....", "....BBB......BBB....",
    "....BBBBBBBBBBBB....", "...BBBBBBBBBBBBBB...", "...BSSSBBBBBBSSSB...",
    "B..BSESBBBBBBSESB..B", "...BSSSBBBBBBSSSB...", "B..BBBBBBPPBBBBBB..B",
    "...BBBBBBBBBBBBBB...", "....BBBBBBBBBBBB....", "....BBBBBBBBBB......",
    "....BBBBBBBBBB..BB..", "....BBBBBBBBBB.BB...", "....BBBBBBBBBB.BB...",
    "....BBBBBBBBBBBB....", "....BB..BBBB..BB....", "....BB........BB....",
  ];
  // Leaning over two keycaps, exactly as the app draws "typing".
  const TYPE = SIT.slice(0, 10).concat([
    "....BBBBBBBBBBBB....", "....BBBBBBBBBB.BB...", "....BB........BB....",
    ".gggggg......gggggg.", ".GGGGGG......GGGGGG.", ".DDDDDD......DDDDDD.",
  ]);

  const put = (rows, cells) => {
    const g = rows.map((r) => r.split(""));
    for (const [r, c, ch] of cells) if (g[r] && c >= 0 && c < W) g[r][c] = ch;
    return g.map((r) => r.join(""));
  };

  const EYE_AREA = [];
  for (const r of [5, 6, 7]) for (const c of [4, 5, 6, 13, 14, 15]) EYE_AREA.push([r, c, "B"]);
  const closed = EYE_AREA.concat([[6,4,"S"],[6,5,"S"],[6,6,"S"],[6,13,"S"],[6,14,"S"],[6,15,"S"]]);
  const happy  = EYE_AREA.concat([[6,4,"S"],[5,5,"S"],[6,6,"S"],[6,13,"S"],[5,14,"S"],[6,15,"S"]]);
  const starry = EYE_AREA.concat(
    [4, 13].flatMap((c) => [
      [5,c,"Y"],[5,c+1,"Y"],[5,c+2,"Y"],
      [6,c,"Y"],[6,c+1,"S"],[6,c+2,"Y"],
      [7,c,"Y"],[7,c+1,"Y"],[7,c+2,"Y"],
    ])
  );
  const squeeze = EYE_AREA.concat([[5,4,"S"],[6,5,"S"],[7,4,"S"],[5,15,"S"],[6,14,"S"],[7,15,"S"]]);
  const blush = [[8,4,"P"],[8,5,"P"],[8,14,"P"],[8,15,"P"]];
  const mouth = [[9,9,"P"],[9,10,"P"]];
  const kneadL = [[13,3,"B"],[13,4,"B"],[13,1,"G"],[13,2,"G"],[13,5,"G"],[13,6,"G"]];
  const kneadR = [[13,15,"B"],[13,16,"B"],[13,13,"G"],[13,14,"G"],[13,17,"G"],[13,18,"G"]];
  const tailSit = [[14,15,"."],[14,16,"."],[11,16,"B"],[11,17,"B"]];
  const tailTyp = [[11,15,"."],[11,16,"."],[10,16,"B"],[10,17,"B"]];

  // Mirrors the app's FACES table and its labels.
  const STATES = {
    idle:        { eyes: "open",    label: "Idle" },
    petting:     { eyes: "happy",   label: "Petting",   blush: true, mouth: true },
    playing:     { eyes: "open",    label: "Scrolling" },
    typing:      { eyes: "open",    label: "Typing",    pose: "type" },
    hunting:     { eyes: "open",    label: "Mouse hunt" },
    overheat:    { eyes: "squeeze", label: "Overheating", pose: "type", hot: true, mouth: true },
    celebrating: { eyes: "starry",  label: "Task complete", mouth: true },
    sleeping:    { eyes: "closed",  label: "Asleep" },
  };

  const mount = document.getElementById("livepet");
  const caption = document.getElementById("petstate");
  if (!mount) return;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `-1 -1 ${W + 2} ${SIT.length + 3}`);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.style.cssText = "width:100%;height:100%;display:block;overflow:visible";
  mount.appendChild(svg);

  const shadow = document.createElementNS(svg.namespaceURI, "ellipse");
  shadow.setAttribute("cy", String(SIT.length + 0.55));
  shadow.setAttribute("ry", "0.72");
  shadow.setAttribute("fill", "rgba(0,0,0,.42)");
  svg.appendChild(shadow);

  // One reusable rect per cell; only the fill ever changes.
  const cells = [];
  for (let y = 0; y < SIT.length + 6; y++) {
    for (let x = 0; x < W; x++) {
      const r = document.createElementNS(svg.namespaceURI, "rect");
      r.setAttribute("x", x); r.setAttribute("y", y);
      r.setAttribute("width", "1"); r.setAttribute("height", "1");
      r.setAttribute("fill", "none");
      svg.appendChild(r);
      cells.push(r);
    }
  }

  const now = () => performance.now();
  let state = "idle";
  let gaze = { x: 0, y: 0 };
  let lastMove = now(), lastScroll = 0, lastPointer = 0, hovering = false;
  let celebrateUntil = 0, huntUntil = 0, typeUntil = 0, overheatUntil = 0;
  let tick = 0, lastTick = 0, keyTimes = [];

  const resolve = () => {
    const t = now();
    if (celebrateUntil > t) return "celebrating";
    if (overheatUntil > t) return "overheat";
    if (hovering) return "petting";
    if (typeUntil > t) return "typing";
    if (huntUntil > t) return "hunting";
    if (lastScroll > t - 900) return "playing";
    if (t - lastPointer > 14000) return "sleeping";
    return "idle";
  };

  function draw() {
    const face = STATES[state] || STATES.idle;
    let g = face.pose === "type" ? TYPE.slice() : SIT.slice();

    if (face.eyes === "open") {
      const dx = gaze.x > 0.3 ? 1 : gaze.x < -0.3 ? -1 : 0;
      const dy = gaze.y > 0.4 ? 1 : gaze.y < -0.4 ? -1 : 0;
      if (dx || dy) g = put(g, [[6,5,"S"],[6,14,"S"],[6+dy,5+dx,"E"],[6+dy,14+dx,"E"]]);
      if (tick % 9 === 8) g = put(g, closed);
    } else if (face.eyes === "closed") g = put(g, closed);
    else if (face.eyes === "happy") g = put(g, happy);
    else if (face.eyes === "starry") g = put(g, starry);
    else if (face.eyes === "squeeze") g = put(g, squeeze);

    if (face.mouth) g = put(g, mouth);
    if (face.blush) g = put(g, blush);
    if (face.pose === "type") g = put(g, tick % 2 ? kneadL : kneadR);
    if (tick % 2 && state !== "sleeping") g = put(g, face.pose === "type" ? tailTyp : tailSit);

    const pal = face.hot ? HOT : PALETTE;
    for (let y = 0; y < SIT.length + 6; y++) {
      const row = g[y] || "";
      for (let x = 0; x < W; x++) {
        const ch = row[x] || ".";
        const rect = cells[y * W + x];
        const fill = ch === "." ? "none" : (pal[ch] || pal.B);
        if (rect.getAttribute("fill") !== fill) rect.setAttribute("fill", fill);
      }
    }
    const h = (g.length || SIT.length);
    shadow.setAttribute("cx", String(W / 2));
    shadow.setAttribute("cy", String(h + 0.5));
    shadow.setAttribute("rx", state === "celebrating" ? "3.4" : "6.2");
    if (caption && caption.textContent !== face.label) caption.textContent = face.label;
  }

  // Bob and hop are transforms on the group, never layout properties.
  function frame(t) {
    const next = resolve();
    if (next !== state) { state = next; draw(); }

    const speed = state === "typing" || state === "celebrating" || state === "hunting" ? 190 : 420;
    if (t - lastTick > speed) { lastTick = t; tick++; draw(); }

    let y = Math.sin(t / 900) * 1.2;
    let rot = 0;
    if (state === "celebrating") y = -Math.abs(Math.sin(t / 130)) * 16;
    else if (state === "playing") { y = Math.sin(t / 150) * 3; rot = Math.sin(t / 150) * 3; }
    else if (state === "typing") y = Math.sin(t / 95) * 1.4;
    else if (state === "overheat") y = Math.sin(t / 40) * 1.6;
    else if (state === "sleeping") y = 4;
    svg.style.transform = `translateY(${y}px) rotate(${rot}deg)`;
    requestAnimationFrame(frame);
  }

  addEventListener("pointermove", (e) => {
    const r = mount.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    gaze.x = Math.max(-1, Math.min(1, (e.clientX - cx) / 320));
    gaze.y = Math.max(-1, Math.min(1, (e.clientY - cy) / 320));
    const t = now(), dt = t - lastMove;
    if (dt > 0) {
      const v = Math.hypot(e.movementX, e.movementY) / dt * 1000;
      if (v > 1600 && !hovering) huntUntil = t + 900;
    }
    lastMove = t; lastPointer = t;
    if (state === "sleeping") draw();
  }, { passive: true });

  addEventListener("scroll", () => { lastScroll = now(); lastPointer = now(); }, { passive: true });

  // Real typing anywhere on the page drives the typing pose, and typing fast
  // enough overheats it — same thresholds as the app.
  addEventListener("keydown", () => {
    const t = now();
    lastPointer = t;
    typeUntil = t + 1500;
    keyTimes = keyTimes.filter((k) => t - k < 2000).concat(t);
    if (keyTimes.length >= 14) overheatUntil = t + 2600;
  });

  mount.addEventListener("pointerenter", () => { hovering = true; lastPointer = now(); });
  mount.addEventListener("pointerleave", () => { hovering = false; });

  // Anything that looks like success makes it celebrate, same as the app.
  document.querySelectorAll("[data-celebrate]").forEach((el) =>
    el.addEventListener("click", () => { celebrateUntil = now() + 2600; lastPointer = now(); })
  );

  draw();
  requestAnimationFrame(frame);
})();
