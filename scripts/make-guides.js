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
// Page shell (same head, styles, nav and footer pattern as help.html)
// ------------------------------------------------------------------------
function page({ file, title, description, body, faq }){
  const url = SITE + "/" + file;
  const ld = faq && faq.length ? `
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faq.map(([q, a]) => ({ "@type": "Question", "name": plain(q), "acceptedAnswer": { "@type": "Answer", "text": plain(a) } })),
}, null, 1)}
</script>` : "";
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
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon-48.png" sizes="48x48" type="image/png">
<link rel="icon" href="/favicon-96.png" sizes="96x96" type="image/png">
<link rel="icon" href="/favicon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">${ld}

<style>
  :root{
    --accent:#124559; --accent-hover:#0d3546; --accent-soft:rgba(18,69,89,.14);
    --ink:#01161e; --ink-soft:#3d5560; --ink-faint:#6b8791;
    --bg:#e3ecda; --paper:#f8fbf0; --paper-soft:#dbe6d1;
    --line:rgba(1,22,30,.13); --line-strong:rgba(1,22,30,.24);
    --radius:5px; --radius-lg:9px;
    --mono: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; }
  body{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    color:var(--ink);
    background:var(--bg);
    min-height:100vh;
  }
  a{ color:var(--accent-hover); }
  a:hover{ color:var(--accent); }
  .wrap{ max-width:760px; margin:0 auto; padding:32px 20px 80px; }
  .nav{ display:flex; align-items:center; flex-wrap:wrap; row-gap:10px; margin-bottom:40px; }
  .brand{ display:flex; align-items:center; gap:10px; text-decoration:none; color:var(--ink); }
  .brand-icon{
    width:32px; height:32px; flex:none;
    display:flex; align-items:center; justify-content:center;
  }
  .brand-name{ font-weight:800; font-size:14px; letter-spacing:.06em; text-transform:uppercase; }
  .nav-links{ display:flex; flex-wrap:wrap; flex-basis:100%; justify-content:flex-end; gap:8px 16px; font-size:12px; }
  .nav-links a{ color:var(--ink-soft); text-decoration:none; font-weight:700; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap; }
  .nav-links a:hover{ color:var(--ink); }
  .crumbs{ font-size:12.5px; color:var(--ink-faint); margin:0 0 14px; }
  .crumbs a{ color:var(--ink-faint); }
  h1{ font-size:30px; margin:0 0 14px; letter-spacing:-.01em; line-height:1.2; }
  h2{ font-size:20px; margin:44px 0 14px; letter-spacing:-.005em; }
  p, li{ font-size:15px; color:var(--ink-soft); line-height:1.65; }
  p b, li b{ color:var(--ink); }
  .lede{ font-size:16px; margin:0 0 22px; }
  .cta-box{
    border:1px solid var(--line-strong); border-radius:var(--radius-lg); background:var(--paper);
    padding:20px 22px; margin:0 0 10px; box-shadow:0 16px 34px -26px rgba(1,22,30,.28);
    display:flex; flex-wrap:wrap; align-items:center; gap:12px 20px;
  }
  .cta-box p{ margin:0; font-size:13.5px; flex:1 1 220px; }
  .btn{
    display:inline-block; background:var(--accent); color:var(--paper); text-decoration:none;
    font-weight:700; font-size:14px; padding:12px 18px; border-radius:var(--radius);
  }
  .btn:hover{ background:var(--accent-hover); color:var(--paper); }
  .stat-row{ display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin:0 0 26px; }
  .stat{ border:1px solid var(--line); border-radius:var(--radius-lg); background:var(--paper); padding:14px 16px; }
  .stat-label{ font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-faint); }
  .stat-value{ font-family:var(--mono); font-size:16px; font-weight:700; color:var(--ink); margin-top:4px; }
  ol.steps{ padding-left:22px; margin:0; }
  ol.steps li{ margin-bottom:8px; }
  .tip{ border-left:3px solid var(--accent); padding:2px 0 2px 16px; margin:0 0 18px; }
  .tip h3{ font-size:15.5px; margin:0 0 4px; color:var(--ink); }
  .tip p{ margin:0; font-size:14.5px; }
  .table-scroll{ overflow-x:auto; border:1px solid var(--line-strong); border-radius:var(--radius-lg); background:var(--paper); }
  table{ border-collapse:collapse; width:100%; font-size:14px; }
  th, td{ text-align:left; padding:11px 14px; border-bottom:1px solid var(--line); vertical-align:top; }
  tr:last-child td{ border-bottom:none; }
  th{ font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-faint); background:var(--paper-soft); }
  td{ color:var(--ink-soft); }
  td.num{ font-family:var(--mono); white-space:nowrap; color:var(--ink); }
  td a{ white-space:nowrap; }
  .note{ font-size:13px; color:var(--ink-faint); }
  .faq-item{
    border:1px solid var(--line-strong); border-radius:var(--radius-lg); background:var(--paper);
    padding:20px 22px; margin-bottom:14px; box-shadow:0 16px 34px -26px rgba(1,22,30,.28);
  }
  .faq-item h3{ font-size:16.5px; margin:0 0 9px; color:var(--ink); }
  .faq-item p{ font-size:14px; line-height:1.65; margin:0; }
  .related{ display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:18px 24px; }
  .related h3{ font-size:11.5px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-faint); margin:0 0 8px; }
  .related ul{ list-style:none; padding:0; margin:0; }
  .related li{ font-size:14.5px; margin:0 0 6px; }
  footer{ margin-top:48px; text-align:center; font-size:13px; color:var(--ink-faint); }
  footer a{ color:var(--ink-faint); }
  @media (max-width: 600px){
    h1{ font-size:25px; }
    /* table rows become small cards so no column hides off-screen */
    .table-scroll{ border:none; background:none; overflow:visible; }
    thead{ display:none; }
    table, tbody, tr, td{ display:block; width:100%; }
    tr{ border:1px solid var(--line-strong); border-radius:var(--radius-lg); background:var(--paper); padding:12px 14px; margin-bottom:10px; }
    td{ border:none; padding:3px 0; font-size:13.5px; }
    td.printer{ font-weight:700; font-size:14.5px; padding-bottom:6px; }
    td.num{ display:flex; justify-content:space-between; gap:12px; }
    td.num::before{ content:attr(data-label); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color:var(--ink-faint); }
    td.go{ padding-top:6px; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="nav">
    <a class="brand" href="/">
      <div class="brand-icon">
        <img src="/logo-icon.png" alt="PrintSlice logo" width="24" height="24">
      </div>
      <span class="brand-name">PrintSlice</span>
    </a>
    <div class="nav-links">
      <a href="/app.html?login=1">Log In</a>
      <a href="/printer-bed-sizes.html">Printer guides</a>
      <a href="/help.html">Help</a>
      <a href="/contact.html">Contact</a>
      <a href="https://discord.gg/sn6zAUXvx2" target="_blank" rel="noopener">Community</a>
    </div>
  </div>
${body}
  <footer>
    <a href="/">← Back to PrintSlice</a>
  </footer>
</div>


<script src="/consent.js" defer></script>
</body></html>
`;
}

function faqHtml(faq){
  return faq.map(([q, a]) => `
  <div class="faq-item">
    <h3>${q}</h3>
    <p>${a}</p>
  </div>`).join("");
}

function relatedHtml(currentSlug){
  const groups = BRANDS.map(brand => {
    const items = GUIDES.filter(g => g.brand === brand && g.slug !== currentSlug);
    if (!items.length) return "";
    return `    <div>
      <h3>${brand}</h3>
      <ul>
${items.map(g => `        <li><a href="/${g.slug}.html">${g.name}</a></li>`).join("\n")}
      </ul>
    </div>`;
  }).filter(Boolean);
  const hub = currentSlug ? `\n  <p><a href="/printer-bed-sizes.html">Bed sizes for every popular printer →</a></p>` : "";
  return `  <div class="related">\n${groups.join("\n")}\n  </div>${hub}`;
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

  const body = `
  <p class="crumbs"><a href="/printer-bed-sizes.html">Printer guides</a> › ${g.name}</p>
  <h1>How to print models bigger than the ${g.name}</h1>
  <p class="lede">The ${g.name} has a build volume of <b>${sizeText}</b>. ${g.context} To print something larger, split the STL into pieces that fit and join them after printing. PrintSlice does the splitting in your browser: with default settings each piece is at most <b>${dims(biggest)} mm</b>, and you can add pin, key or dovetail connectors on the cut faces so the pieces line up and snap together.</p>

  <div class="cta-box">
    <a class="btn" href="${bedParam(g.bed)}">Open PrintSlice with a ${dims(g.bed)} bed</a>
    <p>Free to split and preview, and your first model is free to download. The bed size is filled in for you.</p>
  </div>

  <h2>${g.name} at a glance</h2>
  <div class="stat-row">
    <div class="stat"><div class="stat-label">Build volume</div><div class="stat-value">${sizeText}</div></div>
    <div class="stat"><div class="stat-label">Largest piece</div><div class="stat-value">${dims(biggest)} mm</div></div>
    <div class="stat"><div class="stat-label">Example</div><div class="stat-value">${ex.total} pieces</div></div>
  </div>
  <p><b>Example:</b> ${g.example.what[0].toUpperCase() + g.example.what.slice(1)} (${dims(g.example.size)} mm) doesn't fit the ${g.short}. PrintSlice splits it ${ex.n.join(" × ")} into ${pieceSentence(ex)}, each of which fits the bed.</p>${g.alsoNote ? `
  <p>${g.alsoNote}</p>` : ""}

  <h2>How to split a model for the ${g.short}</h2>
  <ol class="steps">
    <li><a href="${bedParam(g.bed)}">Open PrintSlice with the ${g.short} bed size</a> and drop in your STL file, or try the sample model.</li>
    <li>Press <b>Split into bed-sized pieces</b>. PrintSlice works out the smallest grid of equal pieces that fits, cutting along all three axes if it needs to.</li>
    <li>Open a piece's preview and click a cut face to add a key, pin or dovetail connector. Then download the pieces and slice them in ${g.slicer} as normal.</li>
  </ol>

  <h2>Tips for splitting on the ${g.short}</h2>
${g.tips.map(([h, p]) => `  <div class="tip">
    <h3>${h}</h3>
    <p>${fill(p)}</p>
  </div>`).join("\n")}

  <h2>Questions</h2>${faqHtml(faq)}

  <h2>More printer guides</h2>
${relatedHtml(g.slug)}
`;
  return page({
    file: g.slug + ".html",
    title: `Split STL Files for the ${g.name} (${dims(g.bed)} mm) | PrintSlice`,
    description: `Model too big for your ${g.name}? PrintSlice splits STL files into pieces that fit the ${sizeText} bed, with snap-fit connectors. Free to try in your browser.`,
    body, faq,
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
  const rows = BEDS.map(([name, bed, guide]) => `      <tr>
        <td class="printer">${guide ? `<a href="/${guide}.html">${name}</a>` : name}</td>
        <td class="num" data-label="Build volume">${dims(bed)}</td>
        <td class="num" data-label="Largest piece">${dims(bed.map(maxPiece))}</td>
        <td class="go"><a href="${bedParam(bed)}">Split for this bed</a></td>
      </tr>`).join("\n");
  const body = `
  <h1>3D printer bed sizes, and the largest piece you can print</h1>
  <p class="lede">The build volume of popular 3D printers, with the largest single piece PrintSlice makes for each one at default settings. If your model is bigger than your bed, PrintSlice splits it into pieces this size or smaller and adds connectors so they fit back together.</p>

  <div class="table-scroll">
    <table>
      <thead><tr><th>Printer</th><th>Build volume (mm)</th><th>Largest piece (mm)</th><th></th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>
  <p class="note">Build volumes are X × Y × Z, from each maker's published specifications (checked ${CHECKED}). "Split for this bed" opens PrintSlice with that size filled in.</p>

  <h2>Guides for popular printers</h2>
${relatedHtml(null)}

  <h2>Questions</h2>${faqHtml(faq)}
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
