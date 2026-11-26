// Editing times are on the 206.9-second music and speech master. The archive
// film has a 25.5-second offset after Brothers Night. Crop boxes are measured
// on its 1920 × 1080 frames, inside the edges of the old graphics.
const archive = (from, to, crop) => ({ source: "archive", from, to, crop });
const camera = (source, from, to) => ({ source, from, to });
const wide = (id, at, from, to, options = {}) => ({
  id, at, layout: "wide", media: [archive(from, to)], ...options,
});
const portrait = (id, at, media, title, details = {}) => ({
  id, at, layout: "editorial", media: [media], title, ...details,
});

export const filmEnd = 206.9;
export const sources = {
  archive: "669702d406864f892c7bff5ee6bc453d3029d8ca138627a75e56b1185ab96cf3",
  sound: "c9b1dcee88e321dd3edef7fdd1156d4d85a6deef61721a474b3a000e8deeb911",
  "IMG_0916.MOV": "9afc4cd54b725a0290f18a7b17218cc701b51057bb72bb854b7aa32b6981d840",
  "IMG_0965.MOV": "8a12e1c7b20c63bb31e6ea76d957d7b3f121dd4a481532f329f5d5cc86f4d9ab",
  "IMG_0984.MOV": "25a6fba3a3aa86b312287e8e142b59c2d147e03a59b2e3794f11db397b48f163",
  "IMG_0987.MOV": "e657d6e505b1cfc53489d5c495b5b04d477040c0a9f6b8b15b0402bef1318482",
};

// These November 20 extracts carry the approved SDR grade for the four camera originals.
export const gradedBrothersNight = [
  { file: "brothers-1.mp4", at: 2580, frames: 165, hash: "e0d96846ee83d7f5875811254e98463f06203eeb3f743dc4b53e9933a51da017" },
  { file: "brothers-2.mp4", at: 2745, frames: 90, hash: "211631f1adcdf013a0b03e6695202bc8231026fd9a4b362aa557a0cb8ef10d76" },
  { file: "brothers-3.mp4", at: 2835, frames: 225, hash: "5c5a8a60e78b311f8f1d2d4fb93071c8e2af184c3931c994ff9f1a7edcfa2875" },
  { file: "brothers-4.mp4", at: 3060, frames: 285, hash: "2ad51bfec6e6886912fabe6fe2393792d92b94e63db3ede082fc1493ae6cf69a" },
];
export const brothersNightEnd = 3345;

// The March 27 selects are normalized to 448 × 796 SDR and 30 frames per second.
export const marchBrothersNight = [
  { file: "march-1.mp4", at: 2580, frames: 165, hash: "5eb776d648f5e8295ac60ce6c06776eca1b76fc8c901477bbfed8f21dea52e1b" },
  { file: "march-2.mp4", at: 2745, frames: 168, hash: "08b10ef9247a2e5730ebb7e25c8c357ee6cecf78ec56e89bf1bfd39bfe5d65ea" },
  { file: "march-3.mp4", at: 2913, frames: 174, hash: "60a2d58e8979d024cc49e1b00afadf5e648d099e598f4d25a2c279e95b9c4535" },
  { file: "march-4.mp4", at: 3087, frames: 258, hash: "d9311b0a225978656e8b7978d83da5e4b920e943f224bfb9306b447ecebe1302" },
];

const openingRoom = [1780, 800, 68, 140];
const washroom = [516, 906, 702, 85];
const brothers = { kicker: "NOVEMBER 2025", title: ["Brothers", "Night"], fixedTitle: true };

export const timeline = [
  wide("opening", 0, 61.35, 64.56, {
    title: "Masjid Bilal", kicker: "HAZRAT BILAL ISLAMIC CENTRE · CALGARY", opening: true,
  }),
  wide("the-beginning", 3.73, 4.02, 10.76, {
    media: [archive(4.02, 10.76, openingRoom)], title: "The beginning", endTitle: 3.75, dissolve: true,
  }),
  { id: "invitation", at: 10.83, layout: "quote", dissolve: true, lines: [
    { at: 0.08, text: "It is Allah", size: 115, y: 355, accent: true },
    { at: 1.02, text: "who invites,", size: 92, y: 494 },
    { at: 3.15, text: "not any of us.", size: 79, y: 622 },
  ] },
  wide("prayer-hall", 17.93, 18.24, 19.83, { dissolve: true }),
  wide("listening", 19.93, 19.93, 21.35),
  wide("seated-together", 21.47, 21.59, 24.69),
  wide("first-teacher", 24.8, 24.9, 29.36),
  wide("second-teacher", 29.8, 30.16, 31.17),
  wide("third-teacher", 31.5, 31.78, 32.88),
  wide("fourth-teacher", 33.33, 33.62, 34.53),
  wide("sheikh-jama", 35.0, 35.98, 38.12, {
    title: "Sheikh Jama", endTitle: 3.4, dissolve: true,
  }),
  wide("evening-study", 39.27, 40.85, 43.79),
  wide("congregation", 43.87, 44.73, 46.02, {
    media: [archive(44.73, 46.02, [1396, 784, 258, 155])], dissolve: true,
  }),
  { id: "praying-together", at: 46.63, layout: "landscape-pair", title: "Praying together", dissolve: true, media: [
    archive(47.92, 49.69, [1002, 382, 123, 135]),
    archive(47.92, 49.69, [830, 397, 882, 554]),
  ] },
  { id: "ramadan", at: 50.53, layout: "gallery", title: "Ramadan 2022", dissolve: true, media: [
    archive(52.47, 56.27, [412, 727, 212, 199]),
    archive(52.47, 56.27, [412, 727, 765, 199]),
    archive(52.47, 56.27, [412, 727, 1299, 199]),
  ] },
  wide("ramadan-congregation", 56.3, 61.35, 64.56, { dissolve: true }),
  wide("gathering", 64.63, 64.72, 66.05),
  wide("salaam", 66.13, 66.19, 68.67),
  wide("front-of-hall", 68.77, 68.80, 71.13),
  wide("audience", 71.2, 71.59, 73.49),
  wide("halaqa-audience", 73.83, 74.01, 75.65),
  portrait("halaqa-night", 75.7, archive(76.18, 78.13, [526, 936, "14+138*clip(1-t/0.79\\,0\\,1)", 39]),
    ["Halaqa", "Night"], { dissolve: true }),
  wide("sitting-in-a-circle", 78.37, 78.54, 80.27, { dissolve: true }),
  wide("group-discussion", 80.35, 80.5, 82.35),
  wide("evening-gathering", 82.45, 82.56, 85.0),
  wide("greeting", 85.1, 85.20, 85.99),
  portrait("brothers-night", 86, camera("IMG_0916.MOV", 0.15, 5.65), brothers.title, {
    ...brothers, detail: "Gathering for knowledge", dissolve: true,
  }),
  portrait("brothers-reading", 91.5, camera("IMG_0965.MOV", 0.1, 3.1), brothers.title, {
    ...brothers, detail: "Rooted in faith",
  }),
  portrait("brothers-together", 94.5, camera("IMG_0984.MOV", 0.2, 7.7), brothers.title, {
    ...brothers, detail: "Time well spent together",
  }),
  portrait("brothers-table-tennis", 102, camera("IMG_0987.MOV", 0.6, 10.1), brothers.title, {
    ...brothers, detail: "Friendships that grow",
  }),
  wide("prayer-hall-farewell", 111.5, 85.41, 86.40, { dissolve: true }),
  { id: "outdoor-activities", at: 112.67, layout: "gallery", title: "Outdoor activities", dissolve: true, media: [
    archive(89.66, 92.58, [367, 606, 250, 311]),
    archive(89.66, 92.58, [363, 606, 773, 311]),
    archive(89.66, 92.58, [366, 606, 1315, 311]),
  ] },
  wide("m7-hike", 117.47, 95.34, 97.24, { title: "M7 Hike", kicker: "2025", dissolve: true }),
  wide("trail", 120.7, 97.67, 99.14),
  wide("ascending", 123.07, 99.57, 101.61),
  wide("on-the-mountain", 125.05, 101.83, 105.29),
  wide("volleyball", 130.98, 105.97, 117.19),
  wide("winter-visit", 142.7, 118.16, 132.21, { dissolve: true }),
  wide("wudu-speaker", 157.75, 132.31, 135.39),
  { id: "quran-academy", at: 161.57, layout: "academy-pair", title: "Children’s Qur’an class", dissolve: true, media: [
    archive(137.37, 143.43, [424, 780, 450, 195]),
    archive(137.37, 143.43, [424, 780, 1028, 195]),
  ] },
  { id: "a-place-for-wudu", at: 169.2, layout: "quote", dissolve: true, lines: [
    { at: 0.04, text: "A place for wudu.", size: 101, y: 345, accent: true },
    { at: 0.96, text: "Nobody can pray", size: 86, y: 488 },
    { at: 2.09, text: "without wudu.", size: 80, y: 605 },
  ] },
  { id: "before-and-after", at: 172.47, layout: "compare", title: "From the beginning", kicker: "A COMMUNITY PROMISE",
    detail: "Your support turned a vision into something real.", dissolve: true, media: [
      archive(150.82, 153.72, [436, 772, 313, 148]),
      archive(157.42, 158.45, washroom),
    ] },
  portrait("washroom", 178.9, archive(155.28, 160.07, washroom), ["A space", "of dignity"], {
    kicker: "OUR NEW WASHROOM", dissolve: true,
  }),
  portrait("with-your-support", 185.55, archive(160.39, 166.97, washroom), ["With your", "support"], {
    kicker: "COMPLETED", detail: "100% community powered", dissolve: true,
  }),
  { id: "thank-you", at: 193.0, layout: "closing", title: "Welcome to Masjid Bilal",
    kicker: "JAZAKUM ALLAHU KHAYRAN", detail: "Every contribution became something real.", dissolve: true },
  { id: "support", at: 198.73, layout: "closing", title: "Donate generously", kicker: "HAZRAT BILAL ISLAMIC CENTRE",
    detail: "hbic.ca/donate", continued: true },
];
