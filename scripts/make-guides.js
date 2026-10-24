// Builds the printer guide pages (printer-bed-sizes.html + split-stl-*.html)
// from the data below. Edit here, then run:  node scripts/make-guides.js
//
// Piece sizes and counts are worked out with the same rule the app uses
// (splitMeshByGrid in app.html): each axis has (bed - 2*(margin + JOINT_EXTRA_MARGIN))
// usable, and is cut into ceil(size / usable) equal pieces.
const fs = require("fs");
const path = require("path");

const SITE = "https://printslice.co.uk";
const ROOT = path.join(__dirname, "..");
const MARGIN = 2;          // app.html: default "Safety margin per side"
const JOINT_EXTRA = 3.6;   // app.html: JOINT_EXTRA_MARGIN
const EDGE = MARGIN + JOINT_EXTRA;
const CHECKED = "October 2026";

const usable = mm => mm - 2 * EDGE;
const maxPiece = mm => Math.floor(usable(mm));
const inches = mm => (mm / 25.4).toFixed(1);
const dims = a => a.join(" × ");
const pcs = n => n === 1 ? "1 piece" : n + " pieces";
const bedParam = bed => "/app.html?bed=" + bed.join("x");
function split(model, bed){
  const n = model.map((s, i) => Math.max(1, Math.ceil(s / usable(bed[i]) - 1e-9)));
  return { n, total: n[0] * n[1] * n[2], piece: model.map((s, i) => Math.round(s / n[i])) };
}
function esc(s){ return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function plain(html){ return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'); }

const PRICING = "Splitting and previewing is free, with no account needed, and your first model is free to download with a free account. To download more models, start a 7-day free trial (a card is needed, but you aren't charged until the 7 days are up and you can cancel before then). After that it's £3.99 a month.";
const PRIVACY = "No. The splitting, connectors and 3D preview all run in your browser, so your STL file never leaves your computer.";
const FIT = "Yes. Each tab and socket pair is made from the same shape with a small built-in clearance (0.2 mm by default, adjustable per connector), so the pieces push together without sanding. You can choose a rectangular key, a round pin or a dovetail, which resists being pulled apart.";
const SLICER_CUT = slicer => `${slicer}'s cut tool is fine for one or two cuts you place by hand. PrintSlice is quicker when a model needs several: it works out every cut from your bed size, splits along all three axes in one go, and adds key, pin or dovetail connectors on the seams.`;

// ------------------------------------------------------------------------
// Printer guides
// ------------------------------------------------------------------------
const GUIDES = [
  // ---------------- Bambu Lab ----------------
  {
    slug: "split-stl-bambu-a1-mini", brand: "Bambu Lab",
    name: "Bambu Lab A1 mini", short: "A1 mini", bed: [180, 180, 180], slicer: "Bambu Studio",
    alsoNote: "",
    context: "It's one of the most popular first printers, and its small bed is the most common reason people need to split a model.",
    example: { what: "a full-size cosplay helmet", size: [260, 220, 280] },
    tips: [
      ["Expect a few more pieces", "A 180 mm cube is small for props and cosplay, so big models often split into 4 to 8 pieces on the A1 mini. Check the piece count in PrintSlice first: scaling a model down slightly before splitting can sometimes save a whole row of cuts."],
      ["Steady the tall pieces", "The A1 mini is a bed-slinger, meaning the plate moves back and forth under the print. Tall, narrow pieces are the ones most likely to wobble, so in Bambu Studio rotate each piece onto a broad flat side, and add a brim if one still looks top-heavy."],
      ["Fill each plate", "Smaller pieces from the same model can often share a plate. Import several into Bambu Studio and use Arrange to pack them together."],
      ["Start with the default clearance", "The A1 mini's open frame suits PLA and PETG. Keep the default 0.2 mm connector clearance to begin with; if a joint comes out tight, raise it to 0.3 mm in that connector's settings and download again."],
    ],
    faq: [
      ["Can I use smaller numbers than 180 mm?", "Yes. The bed-size fields stay editable, so if you'd rather keep pieces well away from the edge of the plate, lower the numbers before you press Split."],
    ],
  },
  {
    slug: "split-stl-bambu-a1", brand: "Bambu Lab",
    name: "Bambu Lab A1", short: "A1", bed: [256, 256, 256], slicer: "Bambu Studio",
    alsoNote: "",
    context: "That's a generous bed, but long props, wall art and furniture parts still go over it.",
    example: { what: "a 600 mm prop sword blade", size: [600, 80, 20] },
    tips: [
      ["Long parts only need cutting one way", "Swords, staffs, rails and frames are the classic A1 overflow: one long side and two short ones. PrintSlice only cuts the long side in that case, so you get a short row of pieces with a connector at each seam."],
      ["Use dovetails where it takes load", "On a prop that gets swung or carried, a dovetail joint resists pulling apart better than a straight key. Add glue as well for anything that takes real stress; the connectors keep the pieces lined up while it sets."],
      ["Mind the moving bed", "Like the A1 mini, the A1 moves the plate under the print. Lay tall pieces on a flat side in Bambu Studio, and use a brim if one looks unsteady."],
      ["Upgraded from the A1 mini?", "Pieces split for a 180 mm bed print fine on the A1, but splitting again for 256 mm usually means fewer pieces and fewer seams. {{compare}}"],
    ],
    compare: { size: [260, 220, 280], against: [180, 180, 180], text: (here, there) => `A 260 × 220 × 280 mm helmet needs ${pcs(there)} on the A1 mini but only ${here} on the A1.` },
    faq: [],
  },
  {
    slug: "split-stl-bambu-p1s", brand: "Bambu Lab",
    name: "Bambu Lab P1S", short: "P1S", bed: [256, 256, 256], slicer: "Bambu Studio",
    alsoNote: "The P1P and X1 Carbon share the same 256 mm bed, so everything on this page applies to them too.",
    context: "Its enclosure makes it a favourite for large functional parts, which is exactly where models outgrow the bed.",
    example: { what: "a large electronics enclosure", size: [420, 300, 150] },
    tips: [
      ["ABS and ASA for big functional parts", "The enclosed P1S keeps warm air around the print, which makes ABS and ASA practical for enclosures, car parts and outdoor fittings. These shrink a little more than PLA as they cool, so if a joint comes out tight, try 0.3 mm clearance."],
      ["Glue the seams for strength", "ABS and ASA pieces can be welded with a little acetone; PLA and PETG are best joined with CA glue or epoxy. The connectors hold the pieces in line while it sets."],
      ["Height is split too", "PrintSlice cuts on all three axes, so a tall model is only split into stacked sections when it's taller than the usable 244 mm. Shorter models keep their full height in one piece."],
    ],
    faq: [
      ["Does this work for the Bambu Lab P1P and X1 Carbon?", "Yes. Both have the same 256 × 256 × 256 mm build volume as the P1S, so use the same bed size."],
    ],
  },
  {
    slug: "split-stl-bambu-h2d", brand: "Bambu Lab",
    name: "Bambu Lab H2D", short: "H2D", bed: [325, 320, 325], slicer: "Bambu Studio",
    alsoNote: "That's the single-nozzle volume. When a print uses both nozzles, Bambu Lab lists it as 300 × 320 × 325 mm.",
    context: "Few models outgrow it, but full-size props, signs and furniture parts still do.",
    example: { what: "a large piece of wall art", size: [600, 400, 30] },
    tips: [
      ["Printing with both nozzles? Enter 300 for X", "The dual-nozzle area is 25 mm narrower, so if your pieces will use both nozzles, change Bed X to 300 before splitting. {{compare}}"],
      ["Big pieces, long prints", "A piece close to 313 mm on a side can take many hours. If you'd rather risk less filament on any one print, type a smaller bed size on purpose: PrintSlice will make more, smaller pieces."],
      ["Mix materials between pieces", "Each piece is its own STL, so you can print different pieces in different filaments, such as a PETG body with TPU feet, and join them with the connectors."],
    ],
    compare: { size: [600, 400, 30], against: [300, 320, 325], text: (here, there) => `The wall art in the example needs ${here} pieces at the single-nozzle size, but ${there} at the dual-nozzle size.` },
    faq: [
      ["Which H2D bed size should I enter?", "325 × 320 × 325 mm if the pieces print with one nozzle, or 300 × 320 × 325 mm if they use both nozzles."],
    ],
  },

  // ---------------- Creality ----------------
  {
    slug: "split-stl-ender-3", brand: "Creality",
    name: "Creality Ender 3", short: "Ender 3", bed: [220, 220, 250], slicer: "Cura",
    alsoNote: "The Ender 3 Pro, V2 and V3 SE use the same 220 × 220 × 250 mm volume, as do the Creality K1 and K1C. The Ender 3 S1 is taller, at 220 × 220 × 270 mm.",
    context: "There are millions of them in workshops, and 220 mm runs out quickly on props, cosplay and household parts.",
    example: { what: "a 450 mm tall floor vase", size: [180, 180, 450] },
    tips: [
      ["Enter the bed you really have", "Ender 3s that have had upgrades (a different hotend, a probe or bed clips) often lose a few millimetres of reachable area. Measure what your printer can actually reach and enter that instead of 220."],
      ["Level before a multi-piece job", "Connectors fit best when every piece comes out the right size. A squashed first layer (elephant's foot) can make sockets tight, so re-level the bed, or set a small negative Initial Layer Horizontal Expansion in Cura."],
      ["Ender 3 S1? Enter 270 for height", "The S1 is 20 mm taller than the other Ender 3 models, which can save a horizontal cut on tall models."],
      ["Same bed on the K1 and K1C", "Creality's K1 and K1C also print 220 × 220 × 250 mm, so the same bed size works. The <a href=\"/split-stl-creality-k1c.html\">K1C guide</a> has tips for those printers."],
    ],
    faq: [
      ["Which Ender 3 models have a 220 × 220 × 250 mm bed?", "The original Ender 3, Ender 3 Pro, Ender 3 V2 and Ender 3 V3 SE. The Ender 3 S1 is 220 × 220 × 270 mm."],
    ],
  },
  {
    slug: "split-stl-creality-k1c", brand: "Creality",
    name: "Creality K1C", short: "K1C", bed: [220, 220, 250], slicer: "Creality Print",
    alsoNote: "The original K1 has the same 220 × 220 × 250 mm volume, so everything here applies to it too.",
    context: "It's fast and enclosed, but its bed is the same size as an Ender 3's, so big models still need splitting.",
    example: { what: "a wall-mounted tool holder", size: [350, 250, 60] },
    tips: [
      ["Fast prints, snug joints", "At high speeds, small holes and sockets can come out slightly undersized. If pins won't seat, raise the connector clearance to 0.3 mm, or slow the outer walls for the connector pieces only."],
      ["Carbon-fibre filaments are stiffer", "The K1C's hardened nozzle handles carbon-fibre PLA and PETG. These parts flex less, so a tight joint won't give; start at 0.3 mm clearance and glue the seams."],
      ["Use the enclosure for PETG and ASA", "Large flat pieces are the ones most likely to warp. Keep the lid on and add a brim to big panels."],
    ],
    faq: [
      ["Does this work for the original Creality K1?", "Yes. The K1 and K1C share the same 220 × 220 × 250 mm build volume."],
    ],
  },
  {
    slug: "split-stl-creality-k1-max", brand: "Creality",
    name: "Creality K1 Max", short: "K1 Max", bed: [300, 300, 300], slicer: "Creality Print",
    alsoNote: "",
    context: "It handles most props in one go, so splitting is mainly for signs, furniture parts and full-size cosplay builds.",
    example: { what: "a large shop sign", size: [550, 400, 50] },
    tips: [
      ["Many helmets fit whole", "A 260 × 220 × 280 mm helmet that takes 8 pieces on a Bambu Lab A1 mini fits the K1 Max in one piece. PrintSlice tells you straight away whether a model fits, so check before you split."],
      ["Watch for warping on big panels", "A 288 mm piece of ABS or ASA has a lot of edge to lift. Keep the enclosure closed, use a brim, and give the bed time to heat fully before you start."],
      ["Fewer seams, stronger parts", "Every seam is a weak point. With a 300 mm bed you can often split a long part into two big pieces rather than four small ones, which means fewer joints to glue and sand."],
    ],
    faq: [],
  },
  {
    slug: "split-stl-creality-k2-plus", brand: "Creality",
    name: "Creality K2 Plus", short: "K2 Plus", bed: [350, 350, 350], slicer: "Creality Print",
    alsoNote: "",
    context: "It's one of the biggest beds you can buy at home, yet long props and furniture parts still go over it.",
    example: { what: "a 1 m prop staff", size: [1000, 40, 40] },
    tips: [
      ["Split smaller on purpose", "A 338 mm piece can take most of a day to print. If a failure late in the print would cost too much filament, type a smaller bed size and PrintSlice will make more, shorter pieces."],
      ["Use dovetails on long props", "A staff or spear gets levered at every joint. Dovetails resist pulling apart better than straight keys; add glue as well."],
      ["Colour by piece", "Each piece is its own STL, so you can print different sections in different filaments from the CFS and join them with the connectors."],
    ],
    faq: [],
  },

  // ---------------- Prusa ----------------
  {
    slug: "split-stl-prusa-mk4", brand: "Prusa",
    name: "Original Prusa MK4", short: "MK4", bed: [250, 210, 220], slicer: "PrusaSlicer",
    alsoNote: "The MK4S has the same 250 × 210 × 220 mm volume. The Prusa MINI+ is 180 × 180 × 180 mm, and the CORE One is 250 × 220 × 270 mm.",
    context: "Unlike most printers its bed isn't square, which changes how you should line a model up before splitting.",
    example: { what: "a wall panel", size: [400, 300, 30] },
    tips: [
      ["Put the longest side along X", "The MK4's bed is 250 mm left to right (X) but only 210 mm front to back (Y). PrintSlice cuts along the model's own axes, so if its longest side runs front to back, rotate it 90° in your CAD tool or slicer and export it again before splitting. {{rotate}}"],
      ["Prusa MINI+ owners", "Enter 180 × 180 × 180 for the bed. Expect more pieces than on the MK4; the same panel needs {{mini}} on a MINI+. See the <a href=\"/split-stl-prusa-mini.html\">MINI+ guide</a>."],
      ["CORE One owners", "Enter 250 × 220 × 270. The extra 50 mm of height often avoids a horizontal cut on tall models. See the <a href=\"/split-stl-prusa-core-one.html\">CORE One guide</a>."],
      ["Start with the default clearance", "Keep the 0.2 mm default to begin with, and only raise it (in that connector's settings) if a joint comes out tight."],
    ],
    rotate: { size: [300, 400, 30] },
    faq: [
      ["Does it matter which way round my model is?", "On the MK4, yes. The bed is 250 mm wide but 210 mm deep, so a model whose longest side runs left to right (along X) usually needs fewer pieces than the same model turned 90°."],
    ],
  },
  {
    slug: "split-stl-prusa-mini", brand: "Prusa",
    name: "Original Prusa MINI+", short: "MINI+", bed: [180, 180, 180], slicer: "PrusaSlicer",
    alsoNote: "",
    context: "It's a reliable little printer, but a 180 mm cube fills up fast with busts, helmets and household parts.",
    example: { what: "a 300 mm tall figure bust", size: [200, 160, 300] },
    tips: [
      ["Expect more seams than on an MK4", "{{compare}} Every extra seam is another joint to glue and sand, so check the piece count before you print."],
      ["Move a seam that lands badly", "PrintSlice spaces its cuts evenly, so you don't pick where they fall. If a seam lands somewhere awkward, like across a face, scaling the model slightly or rotating it before splitting moves the cut."],
      ["Hide the seams before painting", "On PLA, glue the pieces, fill the joint line with filler primer or a little body filler, then sand. The connectors keep everything aligned while the glue sets."],
    ],
    compare: { size: [200, 160, 300], against: [250, 210, 220], text: (here, there) => `The bust in the example needs ${here} pieces on the MINI+, against ${pcs(there)} on an MK4.` },
    faq: [],
  },
  {
    slug: "split-stl-prusa-core-one", brand: "Prusa",
    name: "Prusa CORE One", short: "CORE One", bed: [250, 220, 270], slicer: "PrusaSlicer",
    alsoNote: "The CORE One+ is listed at the same 250 × 220 × 270 mm.",
    context: "It's taller and slightly deeper than the MK4, which can save cuts, but long and wide models still need splitting.",
    example: { what: "a tall lamp shade", size: [220, 200, 500] },
    tips: [
      ["Coming from an MK4? Re-enter the bed", "Don't reuse your MK4 numbers: the CORE One's extra 10 mm of depth and 50 mm of height can save a lot of cuts. {{compare}}"],
      ["Front to back is still the short side", "The bed is 250 mm wide but 220 mm deep. If a model's longest side runs front to back, rotate it 90° before splitting."],
      ["Use the enclosure for PETG and ASA", "The heated chamber suits big functional parts. ASA shrinks slightly more than PLA, so try 0.3 mm connector clearance if joints are tight."],
    ],
    compare: { size: [220, 200, 500], against: [250, 210, 220], text: (here, there) => `The lamp shade in the example needs ${here} pieces on the CORE One but ${there} on an MK4.` },
    faq: [
      ["Does this work for the CORE One+?", "Yes. It's listed at the same 250 × 220 × 270 mm build volume."],
    ],
  },

  // ---------------- Elegoo ----------------
  {
    slug: "split-stl-elegoo-neptune-4-pro", brand: "Elegoo",
    name: "Elegoo Neptune 4 Pro", short: "Neptune 4 Pro", bed: [225, 225, 265], slicer: "OrcaSlicer",
    alsoNote: "Its PEI sheet measures 235 × 235 mm, but Elegoo lists the printable area as 225 × 225 mm, so use 225. The Neptune 4 Max is much larger, at 420 × 420 × 480 mm.",
    context: "It's a fast, popular bed-slinger, and long models outgrow its 225 mm bed quickly.",
    example: { what: "a model car body", size: [400, 180, 120] },
    tips: [
      ["Enter 225, not 235", "The plate is bigger than the area the nozzle can actually print on. Use Elegoo's 225 × 225 mm printable size so pieces don't end up hanging off the edge."],
      ["Slow down for tall pieces", "On a fast bed-slinger, tall narrow pieces can shake loose. Lay them on a flat side, use a brim, or lower the speed for those pieces only."],
      ["Check the fit on one joint first", "Before printing every piece, print the two pieces that share one seam and test the fit. If it's tight, raise the clearance to 0.3 mm and download again."],
    ],
    faq: [],
  },
  {
    slug: "split-stl-elegoo-centauri-carbon", brand: "Elegoo",
    name: "Elegoo Centauri Carbon", short: "Centauri Carbon", bed: [256, 256, 256], slicer: "OrcaSlicer",
    alsoNote: "That's the same build volume as the Bambu Lab P1S and X1 Carbon.",
    context: "It's an enclosed CoreXY printer with plenty of room, but storage, workshop and cosplay builds still go over 256 mm.",
    example: { what: "a large drawer insert", size: [520, 300, 80] },
    tips: [
      ["Carbon-fibre parts need a looser fit", "The hardened nozzle prints carbon-fibre filaments, which make stiff parts with little give. Start at 0.3 mm connector clearance and glue the seams."],
      ["Shallow parts only split flat", "Trays, inserts and panels are wide but shallow, so PrintSlice only cuts them across X and Y. Every piece keeps the full height and prints flat on the bed."],
      ["Same pieces as a P1S", "Because the build volume matches the Bambu Lab P1S and X1 Carbon, pieces split for either printer will fit the other."],
    ],
    faq: [],
  },

  // ---------------- Anycubic ----------------
  {
    slug: "split-stl-anycubic-kobra-3", brand: "Anycubic",
    name: "Anycubic Kobra 3", short: "Kobra 3", bed: [250, 250, 260], slicer: "Anycubic Slicer Next",
    alsoNote: "The Kobra 3 V2 is slightly larger, at 255 × 255 × 260 mm, and the Kobra 3 Max is 420 × 420 × 500 mm.",
    context: "It's popular for multi-colour printing with the ACE Pro, and colourful props and signs often outgrow its bed.",
    example: { what: "a serving tray", size: [450, 300, 40] },
    tips: [
      ["Kobra 3 V2? Enter 255", "The V2 gains 5 mm in X and Y. That's rarely enough to remove a cut, but use your printer's real numbers anyway."],
      ["Colour by piece", "Each piece is its own STL, so a sign or prop can be printed in sections of different colours, even without changing filament mid-print."],
      ["Mind the moving bed", "The Kobra 3 is a bed-slinger. Lay tall pieces on a flat side and use a brim if one looks unsteady."],
    ],
    faq: [
      ["What bed size should I use for the Kobra 3 V2?", "255 × 255 × 260 mm. The original Kobra 3 is 250 × 250 × 260 mm."],
    ],
  },

  // ---------------- Flashforge ----------------
  {
    slug: "split-stl-flashforge-adventurer-5m", brand: "Flashforge",
    name: "Flashforge Adventurer 5M", short: "Adventurer 5M", bed: [220, 220, 220], slicer: "OrcaSlicer",
    alsoNote: "",
    context: "It's a fast, affordable CoreXY printer, but at 220 mm in every direction, tall and wide models both need splitting.",
    example: { what: "a desk organiser", size: [300, 300, 150] },
    tips: [
      ["Tall models split sooner", "With 220 mm of height, the 5M is 30 mm shorter than an Ender 3. {{compare}}"],
      ["A bigger nozzle for big pieces", "A 0.6 mm nozzle prints large pieces much faster. Sockets come out a little rougher, so try 0.3 mm connector clearance."],
      ["Fill each plate", "Smaller pieces from the same model can often share the plate, so arrange several before you start."],
    ],
    compare: { size: [180, 180, 450], against: [220, 220, 250], text: (here, there) => `A 450 mm tall vase needs ${here} pieces on the 5M, against ${there} on an Ender 3.` },
    faq: [],
  },
];
const BRANDS = ["Bambu Lab", "Creality", "Prusa", "Elegoo", "Anycubic", "Flashforge"];

// Every printer in the hub table. `guide` links to its page when there is one.
const BEDS = [
  ["Bambu Lab A1 mini", [180, 180, 180], "split-stl-bambu-a1-mini"],
  ["Bambu Lab A1", [256, 256, 256], "split-stl-bambu-a1"],
  ["Bambu Lab P1S / P1P / X1 Carbon", [256, 256, 256], "split-stl-bambu-p1s"],
  ["Bambu Lab H2D (single nozzle)", [325, 320, 325], "split-stl-bambu-h2d"],
  ["Bambu Lab H2D (both nozzles)", [300, 320, 325], "split-stl-bambu-h2d"],
  ["Creality Ender 3 / Pro / V2 / V3 SE", [220, 220, 250], "split-stl-ender-3"],
  ["Creality Ender 3 S1", [220, 220, 270], "split-stl-ender-3"],
  ["Creality K1 / K1C", [220, 220, 250], "split-stl-creality-k1c"],
  ["Creality K1 Max", [300, 300, 300], "split-stl-creality-k1-max"],
  ["Creality K2 Plus", [350, 350, 350], "split-stl-creality-k2-plus"],
  ["Original Prusa MK4 / MK4S", [250, 210, 220], "split-stl-prusa-mk4"],
  ["Original Prusa MINI+", [180, 180, 180], "split-stl-prusa-mini"],
  ["Prusa CORE One / CORE One+", [250, 220, 270], "split-stl-prusa-core-one"],
  ["Elegoo Neptune 4 Pro", [225, 225, 265], "split-stl-elegoo-neptune-4-pro"],
  ["Elegoo Neptune 4 Max", [420, 420, 480]],
  ["Elegoo Centauri Carbon", [256, 256, 256], "split-stl-elegoo-centauri-carbon"],
  ["Anycubic Kobra 3", [250, 250, 260], "split-stl-anycubic-kobra-3"],
  ["Anycubic Kobra 3 V2", [255, 255, 260], "split-stl-anycubic-kobra-3"],
  ["Anycubic Kobra 3 Max", [420, 420, 500]],
  ["Flashforge Adventurer 5M", [220, 220, 220], "split-stl-flashforge-adventurer-5m"],
];

// ------------------------------------------------------------------------
// Page shell (same head, masthead and footer as help.html; styles in site.css)
// ------------------------------------------------------------------------
const DISCORD = "https://discord.gg/sn6zAUXvx2";

function page({ file, title, description, body, faq, cta = "/app.html" }){
  const url = SITE + "/" + file;
  const ld = faq && faq.length ? `
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faq.map(([q, a]) => ({ "@type": "Question", "name": plain(q), "acceptedAnswer": { "@type": "Answer", "text": plain(a) } })),
}, null, 1)}
</script>` : "";
  const current = href => href === "/" + file ? ' aria-current="page"' : "";
  return `<!DOCTYPE html>
<!-- Generated by scripts/make-guides.js. Edit that file and re-run it rather than editing this page. -->
<html lang="en"><head>
<meta charset="UTF-8">
<script src="/i18n.js"></script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="PrintSlice">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="PrintSlice: a model split into four pieces that fit a printer bed">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0c1117">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon-48.png" sizes="48x48" type="image/png">
<link rel="icon" href="/favicon-96.png" sizes="96x96" type="image/png">
<link rel="icon" href="/favicon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">${ld}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&family=Lato:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/site.css">
<script>document.documentElement.classList.add('js')</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="mast">
  <a class="wordmark" href="/" aria-label="PrintSlice home"><svg viewBox="0 0 40 40" aria-hidden="true"><rect x="2" y="2" width="16.5" height="16.5" rx="3" fill="#4e5f76"/><rect x="21.5" y="2" width="16.5" height="16.5" rx="3" fill="#2c3849"/><rect x="2" y="21.5" width="16.5" height="16.5" rx="3" fill="#2c3849"/><rect x="21.5" y="21.5" width="16.5" height="16.5" rx="3" fill="#4e5f76"/><path d="M20 1.5v37M1.5 20h37" stroke="#2c5682" stroke-width="1.1" stroke-linecap="round"/><rect x="15.6" y="15.6" width="8.8" height="8.8" rx="1.5" transform="rotate(45 20 20)" fill="#4a90d9" stroke="#1a344e" stroke-width=".5"/></svg><span>PrintSlice</span></a>
  <nav class="mast-nav" aria-label="Main">
    <a href="/printer-bed-sizes.html"${current("/printer-bed-sizes.html")}>Printer guides</a>
    <a href="/help.html">Help</a>
    <a href="/contact.html">Contact</a>
    <a href="/app.html?login=1">Log In</a>
  </nav>
  <a class="button small" href="/app.html">Start Free Trial</a>
</header>

<main id="main">
${body}
</main>

<footer class="foot">
  <div class="foot-close">
    <p class="foot-line display">Stop designing around your bed size.</p>
    <a class="button" href="${cta}">Start Free Trial</a>
  </div>
  <nav class="foot-nav" aria-label="Footer">
    <a href="/#how-it-works">How It Works</a>
    <a href="/printer-bed-sizes.html">Printer guides</a>
    <a href="/#pricing">Pricing</a>
    <a href="/help.html">Help</a>
    <a href="/contact.html">Contact</a>
    <a href="/affiliates.html">Affiliates</a>
    <a href="${DISCORD}" target="_blank" rel="noopener">Community</a>
  </nav>
  <div class="foot-legal"><span>© 2026 PrintSlice</span><a href="/terms.html">Terms</a><a href="/privacy.html">Privacy</a><a href="/early-access.html">Early access</a><span class="foot-lang" data-lang-slot></span></div>
</footer>

<script src="/consent.js" defer></script>
</body></html>
`;
}

// A section: its heading holds the left margin while the body scrolls past.
function sect(id, heading, inner){
  return `
  <section class="sect" aria-labelledby="${id}">
    <h2 class="sect-h display" id="${id}">${heading}</h2>
    <div class="sect-body">
${inner}
    </div>
  </section>`;
}

function faqHtml(faq){
  return faq.map(([q, a], i) => `      <div class="entry">
        <span class="entry-n" aria-hidden="true">${i + 1}</span>
        <h3>${q}</h3>
        <p>${a}</p>
      </div>`).join("\n");
}

function relatedHtml(currentSlug){
  const groups = BRANDS.map(brand => {
    const items = GUIDES.filter(g => g.brand === brand && g.slug !== currentSlug);
    if (!items.length) return "";
    return `        <div>
          <h3>${brand}</h3>
          <ul>
${items.map(g => `            <li><a href="/${g.slug}.html">${g.name}</a></li>`).join("\n")}
          </ul>
        </div>`;
  }).filter(Boolean);
  const hub = currentSlug ? `\n      <p class="related-more"><a href="/printer-bed-sizes.html">Bed sizes for every popular printer →</a></p>` : "";
  return `      <div class="related">\n${groups.join("\n")}\n      </div>${hub}`;
}

// ------------------------------------------------------------------------
// Drawings. Same colours as the app: each piece gets its own hue, spaced by
// the golden ratio, and the bed is a dashed outline around the first piece.
// ------------------------------------------------------------------------
const hue = i => Math.round(((i * 0.6180339887) % 1) * 360);
const f1 = n => (Math.round(n * 10) / 10).toString();

function plateSvg(g, ex){
  const W = 480, H = 360, padL = 20, padR = 96, padT = 40, padB = 56, gap = 2.5;
  // Seen from above, unless the cuts are mostly through the height (a tall
  // vase): then from the side, so the stacked pieces show.
  const side = ex.n[0] * ex.n[2] > ex.n[0] * ex.n[1];
  const ax = side ? [0, 2] : [0, 1];
  const [MX, MY] = ax.map(i => g.example.size[i]), [BX, BY] = ax.map(i => g.bed[i]);
  const [nx, ny] = ax.map(i => ex.n[i]), px = MX / nx, py = MY / ny;
  // Millimetre space: the model sits at the origin, the bed is centred on piece 1.
  const bx0 = px / 2 - BX / 2, by0 = py / 2 - BY / 2;
  const minX = Math.min(0, bx0), minY = Math.min(0, by0);
  const maxX = Math.max(MX, bx0 + BX), maxY = Math.max(MY, by0 + BY);
  const s = Math.min((W - padL - padR) / (maxX - minX), (H - padT - padB) / (maxY - minY));
  const ox = padL + ((W - padL - padR) - (maxX - minX) * s) / 2 - minX * s;
  const oy = padT + ((H - padT - padB) - (maxY - minY) * s) / 2 - minY * s;
  const X = mm => ox + mm * s, Y = mm => oy + mm * s;
  let out = "", i = 0;
  for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++){
    out += `<rect x="${f1(X(c * px) + gap)}" y="${f1(Y(r * py) + gap)}" width="${f1(px * s - 2 * gap)}" height="${f1(py * s - 2 * gap)}" fill="hsl(${hue(i++)} 55% 55%)"/>`;
  }
  out += `<rect x="${f1(X(bx0))}" y="${f1(Y(by0))}" width="${f1(BX * s)}" height="${f1(BY * s)}" fill="none" stroke="#4a90d9" stroke-width="1.5" stroke-dasharray="6 5"/>`;
  out += `<text x="${f1(X(bx0))}" y="${f1(Y(by0) - 10)}" fill="#e8eef6" font-size="14">${side ? `Side view: bed ${BX} wide, ${BY} mm high` : `Bed ${BX} × ${BY} mm`}</text>`;
  // Dimension lines for the model: width along the bottom, depth on the right.
  const yd = Math.max(Y(MY), Y(by0 + BY)) + 20, xd = Math.max(X(MX), X(bx0 + BX)) + 20;
  out += `<path d="M${f1(X(0))} ${f1(yd - 5)}V${f1(yd + 5)}M${f1(X(MX))} ${f1(yd - 5)}V${f1(yd + 5)}M${f1(X(0))} ${f1(yd)}H${f1(X(MX))}M${f1(xd - 5)} ${f1(Y(0))}H${f1(xd + 5)}M${f1(xd - 5)} ${f1(Y(MY))}H${f1(xd + 5)}M${f1(xd)} ${f1(Y(0))}V${f1(Y(MY))}" fill="none" stroke="#e8eef6" stroke-opacity=".7" stroke-width="1.2"/>`;
  out += `<text x="${f1((X(0) + X(MX)) / 2)}" y="${f1(yd + 22)}" fill="#e8eef6" font-size="14" text-anchor="middle">${MX} mm</text>`;
  out += `<text x="${f1(xd + 10)}" y="${f1((Y(0) + Y(MY)) / 2 + 4)}" fill="#e8eef6" font-size="14">${MY} mm</text>`;
  const label = `${g.example.what[0].toUpperCase() + g.example.what.slice(1)}, ${dims(g.example.size)} mm, cut into ${pcs(ex.total)} for a ${dims(g.bed)} mm bed${side ? ", seen from the side" : ""}`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${out}</svg>`;
}

// Hub table: each bed drawn to one shared scale, centred in its cell, with
// the largest piece filled in.
const BIGGEST_BED = Math.max(...BEDS.map(([, bed]) => Math.max(bed[0], bed[1])));
function footprintSvg(bed){
  const k = 44 / BIGGEST_BED, w = bed[0] * k, h = bed[1] * k, e = EDGE * k;
  const x = (48 - w) / 2, y = (48 - h) / 2;
  return `<svg class="foot-print" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2.5 2"/><rect x="${f1(x + e)}" y="${f1(y + e)}" width="${f1(w - 2 * e)}" height="${f1(h - 2 * e)}" fill="#4e5f76"/></svg>`;
}

const dimsX = a => a.join('<span class="x">×</span>');
// Hub head: all the footprints stacked from one corner, a few of them named.
function bedsSvg(){
  const W = 480, H = 360, pad = 28, side = 290, k = side / BIGGEST_BED;
  const x0 = pad, y1 = pad + (H - 2 * pad + side) / 2;
  const named = [["A1 mini", [180, 180]], ["Ender 3", [220, 220]], ["A1, P1S", [256, 256]], ["K1 Max", [300, 300]], ["K2 Plus", [350, 350]], ["Kobra 3 Max", [420, 420]]];
  const seen = new Set();
  let out = "";
  BEDS.forEach(([, bed]) => {
    const key = bed[0] + "x" + bed[1];
    if (seen.has(key)) return;
    seen.add(key);
    out += `<rect x="${f1(x0)}" y="${f1(y1 - bed[1] * k)}" width="${f1(bed[0] * k)}" height="${f1(bed[1] * k)}" fill="none" stroke="#e8eef6" stroke-opacity=".22" stroke-width="1"/>`;
  });
  // Names sit in a column clear of the drawing, each joined to its bed's back-right corner.
  const labelX = x0 + side + 22;
  named.forEach(([label, bed], i) => {
    const x = x0 + bed[0] * k, y = y1 - bed[1] * k, c = "#4a90d9";
    out += `<rect x="${f1(x0)}" y="${f1(y)}" width="${f1(bed[0] * k)}" height="${f1(bed[1] * k)}" fill="none" stroke="${c}" stroke-width="1.5"/>`;
    out += `<path d="M${f1(x)} ${f1(y)}H${f1(labelX - 6)}" stroke="${c}" stroke-opacity=".55" stroke-width="1" stroke-dasharray="2 3"/>`;
    out += `<text x="${f1(labelX)}" y="${f1(y + 4)}" fill="#e8eef6" font-size="12">${bed[0]} mm <tspan fill-opacity=".62">${label}</tspan></text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="The bed of every printer on this page drawn to the same scale, from 180 mm up to 420 mm square">${out}</svg>`;
}

const pieceSentence = (r) => `${r.total} pieces of about ${dims(r.piece)} mm`;

function guidePage(g){
  const biggest = g.bed.map(maxPiece);
  const ex = split(g.example.size, g.bed);
  const fill = text => text
    .replace("{{compare}}", () => {
      const here = split(g.compare.size, g.bed).total, there = split(g.compare.size, g.compare.against).total;
      return g.compare.text(here, there);
    })
    .replace("{{rotate}}", () => {
      const turned = split(g.rotate.size, g.bed), straight = split(g.example.size, g.bed);
      return `The ${dims(g.example.size.slice(0, 2))} mm wall panel in the example above needs ${straight.total} pieces lined up along X, but ${turned.total} if it's turned the other way.`;
    })
    .replace("{{mini}}", () => `${split(g.example.size, [180, 180, 180]).total}`);

  const sizeText = `${dims(g.bed)} mm`;
  const faq = [
    [`What is the ${g.name}'s build volume?`, `${sizeText} (about ${g.bed.map(inches).join(" × ")} inches).${g.alsoNote ? " " + g.alsoNote : ""}`],
    [`What's the largest single piece PrintSlice makes for the ${g.short}?`, `With default settings, ${dims(biggest)} mm. PrintSlice keeps ${EDGE} mm clear on every side: a ${MARGIN} mm safety margin you can change, plus ${JOINT_EXTRA} mm so connector tabs still fit on the bed.`],
    [`Can't I just split the model in ${g.slicer}?`, SLICER_CUT(g.slicer)],
    ["Will the printed pieces fit back together?", FIT],
    ["Is my model uploaded anywhere?", PRIVACY],
    ["Does PrintSlice cost anything?", PRICING],
    ...g.faq,
  ];
  const layers = ex.n[2] > 1 ? `, ${ex.n[2]} layers high` : "";

  const body = `  <div class="guide-top">
    <div class="guide-intro">
      <p class="crumbs" data-rise><a href="/printer-bed-sizes.html">Printer guides</a> › ${g.name}</p>
      <h1 class="display" data-rise style="--i:1">How to print models bigger than the ${g.name}</h1>
      <p class="guide-lede" data-rise style="--i:2">The ${g.name} has a build volume of <b>${sizeText}</b>. ${g.context}</p>
      <p class="guide-more" data-rise style="--i:2">To print something larger, split the STL into pieces that fit and join them after printing. PrintSlice does the splitting in your browser: with default settings each piece is at most <b>${dims(biggest)} mm</b>, and you can add pin, key or dovetail connectors on the cut faces so the pieces line up and snap together.</p>
      <div class="guide-cta" data-rise style="--i:3">
        <a class="button" href="${bedParam(g.bed)}">Open PrintSlice with a ${dims(g.bed)} bed</a>
        <p>Free to split and preview, and your first model is free to download. The bed size is filled in for you.</p>
      </div>
    </div>
    <figure class="plate guide-plate" data-rise style="--i:2">
      ${plateSvg(g, ex)}
      <figcaption><span>${g.example.what[0].toUpperCase() + g.example.what.slice(1)}, ${dims(g.example.size)} mm</span><span>${pcs(ex.total)} on the ${g.short}${layers}</span></figcaption>
    </figure>
  </div>
${sect("glance", `${g.name} at a glance`, `      <div class="figures specs">
        <div><span class="fig-label">Build volume</span><span class="fig-value">${dimsX(g.bed)}<small>mm</small></span></div>
        <div><span class="fig-label">Largest piece</span><span class="fig-value">${dimsX(biggest)}<small>mm</small></span></div>
        <div><span class="fig-label">Example</span><span class="fig-value">${ex.total}<small>pieces</small></span></div>
      </div>
      <div class="prose sect-note">
        <p><b>Example:</b> ${g.example.what[0].toUpperCase() + g.example.what.slice(1)} (${dims(g.example.size)} mm) doesn't fit the ${g.short}. PrintSlice splits it ${ex.n.join(" × ")} into ${pieceSentence(ex)}, each of which fits the bed.</p>${g.alsoNote ? `
        <p>${g.alsoNote}</p>` : ""}
      </div>`)}
${sect("steps", `How to split a model for the ${g.short}`, `      <ol class="steps">
        <li><span><a href="${bedParam(g.bed)}">Open PrintSlice with the ${g.short} bed size</a> and drop in your STL file, or try the sample model.</span></li>
        <li><span>Press <b>Split into bed-sized pieces</b>. PrintSlice works out the smallest grid of equal pieces that fits, cutting along all three axes if it needs to.</span></li>
        <li><span>Open a piece's preview and click a cut face to add a key, pin or dovetail connector. Then download the pieces and slice them in ${g.slicer} as normal.</span></li>
      </ol>`)}
${sect("tips", `Tips for splitting on the ${g.short}`, `      <div class="tips">
${g.tips.map(([h, p]) => `        <div class="tip">
          <h3>${h}</h3>
          <p>${fill(p)}</p>
        </div>`).join("\n")}
      </div>`)}
${sect("questions", "Questions", faqHtml(faq))}
${sect("more", "More printer guides", relatedHtml(g.slug))}
`;
  return page({
    file: g.slug + ".html",
    title: `Split STL Files for the ${g.name} (${dims(g.bed)} mm) | PrintSlice`,
    description: `Model too big for your ${g.name}? PrintSlice splits STL files into pieces that fit the ${sizeText} bed, with snap-fit connectors. Free to try in your browser.`,
    body, faq, cta: bedParam(g.bed),
  });
}

function hubPage(){
  const ex = { size: [400, 200, 100], bed: [220, 220, 250] };
  const exR = split(ex.size, ex.bed);
  const faq = [
    ["What does build volume mean?", "It's the largest box your printer can print in one go: X is left to right, Y is front to back and Z is height. Makers also call it the print size or bed size."],
    ["Why is the largest piece smaller than the bed?", `PrintSlice keeps ${EDGE} mm clear on every side by default: a ${MARGIN} mm safety margin you can change, plus ${JOINT_EXTRA} mm so a connector tab sticking out of a piece still fits on the bed. That's ${(2 * EDGE).toFixed(1)} mm off each axis in total.`],
    ["How many pieces will my model need?", `Divide each side of your model by your printer's largest piece size, round each answer up, and multiply the three together. For example, a ${dims(ex.size)} mm model on a ${dims(ex.bed)} mm bed needs ${exR.n.join(" × ")} = ${exR.total} pieces.`],
    ["What if my printer isn't listed?", "Look up its build volume on the maker's spec page, open PrintSlice and type the three numbers into the bed-size fields."],
    ["Does PrintSlice cost anything?", PRICING],
  ];
  const rows = BEDS.map(([name, bed, guide]) => `        <tr>
          <td class="fp">${footprintSvg(bed)}</td>
          <td class="printer">${guide ? `<a href="/${guide}.html">${name}</a>` : name}</td>
          <td class="n" data-label="Build volume">${dims(bed)}</td>
          <td class="n" data-label="Largest piece">${dims(bed.map(maxPiece))}</td>
          <td class="go"><a href="${bedParam(bed)}">Split for this bed</a></td>
        </tr>`).join("\n");
  const body = `  <div class="head with-plate">
    <div>
      <h1 class="display" data-rise>3D printer bed sizes, and the largest piece you can print</h1>
      <p class="lede" data-rise style="--i:1">The build volume of popular 3D printers, with the largest single piece PrintSlice makes for each one at default settings. If your model is bigger than your bed, PrintSlice splits it into pieces this size or smaller and adds connectors so they fit back together.</p>
    </div>
    <figure class="plate" data-rise style="--i:2">
      ${bedsSvg()}
      <figcaption><span>Every bed on this page, to one scale</span><span>Front-left corners lined up</span></figcaption>
    </figure>
  </div>

  <div class="beds-table" data-rise style="--i:2">
    <table class="table">
      <thead><tr><th><span class="sr">Bed to scale</span></th><th>Printer</th><th>Build volume (mm)</th><th>Largest piece (mm)</th><th><span class="sr">Open PrintSlice</span></th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    <p class="table-note">Beds are drawn to one scale, with the largest piece filled in. Build volumes are X × Y × Z, from each maker's published specifications (checked ${CHECKED}). "Split for this bed" opens PrintSlice with that size filled in.</p>
  </div>
${sect("guides", "Guides for popular printers", relatedHtml(null))}
${sect("questions", "Questions", faqHtml(faq))}
`;
  return page({
    file: "printer-bed-sizes.html",
    title: "3D Printer Bed Sizes and the Largest Piece You Can Print | PrintSlice",
    description: "Build volumes for 20 popular 3D printers from Bambu Lab, Creality, Prusa, Elegoo, Anycubic and Flashforge, with the largest piece you can print on each and how to split bigger models.",
    body, faq,
  });
}

const out = [["printer-bed-sizes.html", hubPage()], ...GUIDES.map(g => [g.slug + ".html", guidePage(g)])];
for (const [file, html] of out){
  fs.writeFileSync(path.join(ROOT, file), html);
  console.log("wrote", file);
}
