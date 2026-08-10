/* Day / night palettes — the validated accessible hues from the 2D map
   (CLAUDE.md: don't invent new ones). Copied from scripts/app3d.js so the two
   3D renderers look like the same city at the same hour. */

export const PAL = {
  light: {
    skyTop: "#cfe3ef", skyBot: "#efe5cf", ground: "#e2d9c0", groundEdge: "#cdc2a3",
    district: "rgba(120,112,96,0.10)", districtHex: "#786050", districtOpacity: 0.10,
    sea: "#bcd9e4", seaEdge: "#8fb6c4",
    road: "#d3c6a3", roadEdge: "#9c9070", roadSeam: "#5a503c", seamOpacity: 0.30,
    quay: "#c8bb99", quayEdge: "#9b8f6e",
    wall: "#7d7566", wallTop: "#948b7a",
    ink: "#3d3a35", label: "#52514e",
    gold: "#d9a419", goldDark: "#a87b0a", fog: "#d6e2eb",
    sun: 1.55, hemi: 0.62, hemiSky: "#cfe3ef", hemiGround: "#b9ac8c", sunColor: "#fff3dc",
    themes: { witness: "#eda100", sign: "#1baf7a", discourse: "#2a78d6", controversy: "#e34948", love: "#e87ba4", passion: "#4a3aa7", resurrection: "#008300" },
  },
  dark: {
    skyTop: "#0b1626", skyBot: "#25272b", ground: "#23221f", groundEdge: "#2e2c27",
    district: "rgba(255,255,255,0.05)", districtHex: "#ffffff", districtOpacity: 0.05,
    sea: "#16303a", seaEdge: "#2c5666",
    road: "#413e33", roadEdge: "#5d5943", roadSeam: "#000000", seamOpacity: 0.28,
    quay: "#3a382f", quayEdge: "#57523f",
    wall: "#5c5648", wallTop: "#6d6757",
    ink: "#d5d3c8", label: "#c3c2b7",
    gold: "#e8b83a", goldDark: "#b8860b", fog: "#101824",
    sun: 1.15, hemi: 0.95, hemiSky: "#31445f", hemiGround: "#2b2721", sunColor: "#c8d8f2",
    themes: { witness: "#c98500", sign: "#199e70", discourse: "#3987e5", controversy: "#e66767", love: "#d55181", passion: "#9085e9", resurrection: "#2fb457" },
  },
};

/* the same low sun the canvas renderer shades with: (x, up, z) */
export const SUN = (() => { const l = [0.48, 0.72, 0.52], n = Math.hypot(...l); return l.map(v => v / n); })();
