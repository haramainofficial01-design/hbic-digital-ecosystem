// The opening title is embedded in the archive. These paths extend its wide
// cap proportions, square terminals and short crossbars to the project titles.
const caps = {
  A: [116, "M39 0h38l39 80H87l-7-16H36l-7 16H0zm6 45h26L58 17z"],
  B: [104, "M0 0h65c24 0 34 9 34 22 0 8-5 14-13 18 12 2 18 9 18 18 0 15-12 22-37 22H0zm26 18v14h35c8 0 12-2 12-7s-4-7-12-7zm0 30v14h39c8 0 12-2 12-7s-4-7-12-7z"],
  C: [114, "M114 29H86c-3-8-11-11-28-11-22 0-31 7-31 22s9 22 31 22c17 0 25-4 28-12h28c-4 20-21 32-56 32C18 82 0 66 0 40S18-2 58-2c35 0 52 11 56 31z"],
  D: [110, "M0 0h52c40 0 58 13 58 40S92 80 52 80H0zm26 19v42h24c23 0 33-6 33-21S73 19 50 19z"],
  E: [87, "M0 0h87v19H26v12h56v17H26v13h61v19H0z"],
  F: [87, "M0 0h87v19H26v14h55v18H26v29H0z"],
  G: [114, "M114 31H86c-4-9-13-12-29-12-21 0-31 7-31 21s10 22 32 22c15 0 25-5 28-12H57V34h57v46H98l-4-11C86 78 73 82 55 82 18 82 0 67 0 40S19-2 58-2c34 0 51 11 56 33z"],
  H: [105, "M0 0h26v30h53V0h26v80H79V49H26v31H0z"],
  I: [25, "M0 0h25v80H0z"],
  J: [91, "M65 0h26v47c0 23-16 35-46 35C15 82 0 70 0 48h26c0 10 6 15 19 15 14 0 20-5 20-16z"],
  K: [107, "M0 0h26v33L69 0h35L55 38l52 42H70L26 43v37H0z"],
  L: [88, "M0 0h26v60h62v20H0z"],
  M: [139, "M0 0h35l34 47L104 0h35v80h-26V29L79 76H60L26 29v51H0z"],
  N: [105, "M0 0h29l50 49V0h26v80H77L26 30v50H0z"],
  O: [115, "M57-2c40 0 58 15 58 42S97 82 57 82 0 67 0 40 18-2 57-2zm0 20c-21 0-30 7-30 22s9 22 30 22c22 0 31-7 31-22S79 18 57 18z"],
  P: [100, "M0 0h62c26 0 38 9 38 26S88 53 62 53H26v27H0zm26 19v16h32c11 0 15-2 15-8s-4-8-15-8z"],
  R: [107, "M0 0h63c25 0 37 9 37 25 0 12-7 20-22 24l29 31H75L48 52H26v28H0zm26 19v15h33c10 0 15-2 15-8 0-5-5-7-15-7z"],
  S: [104, "M102 24H75c-2-5-9-8-25-8-14 0-20 2-20 6 0 4 4 6 14 7l25 3c24 3 35 10 35 24 0 17-17 26-53 26C18 82 2 73 0 55h27c2 6 10 9 26 9 16 0 23-2 23-6 0-4-4-6-15-7l-26-3C12 45 2 38 2 24 2 7 19-2 50-2c32 0 48 8 52 26z"],
  T: [96, "M0 0h96v20H61v60H35V20H0z"],
  U: [106, "M0 0h26v44c0 13 8 18 27 18s27-5 27-18V0h26v45c0 25-15 37-53 37S0 70 0 45z"],
  V: [115, "M0 0h30l28 58L85 0h30L75 80H40z"],
  W: [157, "M0 0h27l18 53L66 0h25l21 53L130 0h27l-31 80H98L78 31 59 80H31z"],
  Y: [115, "M0 0h32l26 31L83 0h32L71 50v30H44V50z"],
  Z: [101, "M3 0h98v17L39 61h62v19H0V62l63-43H3z"],
  0: [105, "M52-2c35 0 53 15 53 42S87 82 52 82 0 67 0 40 17-2 52-2zm0 20c-17 0-25 7-25 22s8 22 25 22c18 0 26-7 26-22S70 18 52 18z"],
  1: [64, "M32 0h25v80H31V23L6 32V12z"],
  "%": [108, "M22-1c15 0 22 8 22 21S37 41 22 41 0 33 0 20 7-1 22-1zm0 13c-6 0-9 3-9 8s3 8 9 8 9-3 9-8-3-8-9-8zM78 0h18L31 80H13zm8 40c15 0 22 8 22 21s-7 21-22 21-22-8-22-21 7-21 22-21zm0 13c-6 0-9 3-9 8s3 8 9 8 9-3 9-8-3-8-9-8z"],
  "/": [55, "M36 0h19L19 80H0z"],
  ".": [23, "M0 62h23v18H0z"],
};

export function titlePaths(text, { x = 960, top, height, maxWidth = 1560, spacing = 8, fill = "#fffaf1" }) {
  let advance = 0;
  const placed = [];
  for (const letter of text) {
    if (letter === " ") {
      advance += 39;
      continue;
    }
    const glyph = caps[letter];
    if (!glyph) throw new Error(`Missing title character: ${letter}`);
    const [width, path] = glyph;
    placed.push(`<path transform="translate(${advance} 0)" d="${path}"/>`);
    advance += width + spacing;
  }

  const width = advance - spacing;
  const scale = Math.min(height / 80, maxWidth / width);
  return `<g transform="translate(${x - width * scale / 2} ${top}) scale(${scale})" fill="${fill}" fill-rule="evenodd">${placed.join("")}</g>`;
}
