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
const bedParam = bed => "/app.html?bed=" + bed.join("x");
function split(model, bed){
  const n = model.map((s, i) => Math.max(1, Math.ceil(s / usable(bed[i]) - 1e-9)));
  return { n, total: n[0] * n[1] * n[2], piece: model.map((s, i) => Math.round(s / n[i])) };
}
function esc(s){ return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function plain(html){ return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'); }

const PRICING = "Splitting and previewing is free, with no account needed. To download the pieces you create a free account and start a 7-day free trial (a card is needed, but you aren't charged until the 7 days are up and you can cancel before then). After that it's £3.99 a month.";
const PRIVACY = "No. The splitting, connectors and 3D preview all run in your browser, so your STL file never leaves your computer.";
const FIT = "Yes. Each tab and socket pair is made from the same shape with a small built-in clearance (0.2 mm by default, adjustable per connector), so the pieces push together without sanding. You can choose a rectangular key, a round pin or a dovetail, which resists being pulled apart.";
const SLICER_CUT = slicer => `${slicer}'s cut tool is fine for one or two cuts you place by hand. PrintSlice is quicker when a model needs several: it works out every cut from your bed size, splits along all three axes in one go, and adds key, pin or dovetail connectors on the seams.`;

// ------------------------------------------------------------------------
// Printer guides
// ------------------------------------------------------------------------
const GUIDES = [
  {
    slug: "split-stl-bambu-a1-mini",
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
    slug: "split-stl-bambu-a1",
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
    compare: { what: "A 260 × 220 × 280 mm helmet", size: [260, 220, 280], against: [180, 180, 180], againstName: "A1 mini" },
    faq: [],
  },
  {
    slug: "split-stl-bambu-p1s",
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
    slug: "split-stl-ender-3",
    name: "Creality Ender 3", short: "Ender 3", bed: [220, 220, 250], slicer: "Cura",
    alsoNote: "The Ender 3 Pro, V2 and V3 SE use the same 220 × 220 × 250 mm volume, as do the Creality K1 and K1C. The Ender 3 S1 is taller, at 220 × 220 × 270 mm.",
    context: "There are millions of them in workshops, and 220 mm runs out quickly on props, cosplay and household parts.",
    example: { what: "a 450 mm tall floor vase", size: [180, 180, 450] },
    tips: [
      ["Enter the bed you really have", "Ender 3s that have had upgrades (a different hotend, a probe or bed clips) often lose a few millimetres of reachable area. Measure what your printer can actually reach and enter that instead of 220."],
      ["Level before a multi-piece job", "Connectors fit best when every piece comes out the right size. A squashed first layer (elephant's foot) can make sockets tight, so re-level the bed, or set a small negative Initial Layer Horizontal Expansion in Cura."],
      ["Ender 3 S1? Enter 270 for height", "The S1 is 20 mm taller than the other Ender 3 models, which can save a horizontal cut on tall models."],
      ["Same bed on the K1 and K1C", "Creality's K1 and K1C also print 220 × 220 × 250 mm, so the same bed size and button work for them."],
    ],
    faq: [
      ["Which Ender 3 models have a 220 × 220 × 250 mm bed?", "The original Ender 3, Ender 3 Pro, Ender 3 V2 and Ender 3 V3 SE. The Ender 3 S1 is 220 × 220 × 270 mm."],
    ],
  },
  {
    slug: "split-stl-prusa-mk4",
    name: "Original Prusa MK4", short: "MK4", bed: [250, 210, 220], slicer: "PrusaSlicer",
    alsoNote: "The MK4S has the same 250 × 210 × 220 mm volume. The Prusa MINI+ is 180 × 180 × 180 mm, and the CORE One is 250 × 220 × 270 mm.",
    context: "Unlike most printers its bed isn't square, which changes how you should line a model up before splitting.",
    example: { what: "a wall panel", size: [400, 300, 30] },
    tips: [
      ["Put the longest side along X", "The MK4's bed is 250 mm left to right (X) but only 210 mm front to back (Y). PrintSlice cuts along the model's own axes, so if its longest side runs front to back, rotate it 90° in your CAD tool or slicer and export it again before splitting. {{rotate}}"],
      ["Prusa MINI+ owners", "Enter 180 × 180 × 180 for the bed. Expect more pieces than on the MK4; the same panel needs {{mini}} on a MINI+."],
      ["CORE One owners", "Enter 250 × 220 × 270. The extra 50 mm of height often avoids a horizontal cut on tall models."],
      ["Start with the default clearance", "Keep the 0.2 mm default to begin with, and only raise it (in that connector's settings) if a joint comes out tight."],
    ],
    rotate: { size: [300, 400, 30] },
    faq: [
      ["Does it matter which way round my model is?", "On the MK4, yes. The bed is 250 mm wide but 210 mm deep, so a model whose longest side runs left to right (along X) usually needs fewer pieces than the same model turned 90°."],
    ],
  },
];

// Every printer in the hub table. `guide` links to its page when there is one.
const BEDS = [
  ["Bambu Lab A1 mini", [180, 180, 180], "split-stl-bambu-a1-mini"],
  ["Bambu Lab A1", [256, 256, 256], "split-stl-bambu-a1"],
  ["Bambu Lab P1S / P1P / X1 Carbon", [256, 256, 256], "split-stl-bambu-p1s"],
  ["Bambu Lab H2D (single nozzle)", [325, 320, 325]],
  ["Creality Ender 3 / Pro / V2 / V3 SE", [220, 220, 250], "split-stl-ender-3"],
  ["Creality Ender 3 S1", [220, 220, 270], "split-stl-ender-3"],
  ["Creality K1 / K1C", [220, 220, 250], "split-stl-ender-3"],
  ["Creality K1 Max", [300, 300, 300]],
  ["Elegoo Neptune 4 Pro", [225, 225, 265]],
  ["Original Prusa MK4 / MK4S", [250, 210, 220], "split-stl-prusa-mk4"],
  ["Original Prusa MINI+", [180, 180, 180], "split-stl-prusa-mk4"],
  ["Prusa CORE One", [250, 220, 270], "split-stl-prusa-mk4"],
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
  .related{ list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px 20px; }
  .related li{ font-size:14.5px; }
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
  const items = GUIDES.filter(g => g.slug !== currentSlug)
    .map(g => `    <li><a href="/${g.slug}.html">Split STL files for the ${g.name}</a></li>`);
  if (currentSlug) items.push(`    <li><a href="/printer-bed-sizes.html">Bed sizes for every popular printer</a></li>`);
  return `  <ul class="related">\n${items.join("\n")}\n  </ul>`;
}

const pieceSentence = (r) => `${r.total} pieces of about ${dims(r.piece)} mm`;

function guidePage(g){
  const biggest = g.bed.map(maxPiece);
  const ex = split(g.example.size, g.bed);
  const fill = text => text
    .replace("{{compare}}", () => {
      const a = split(g.compare.size, g.compare.against), b = split(g.compare.size, g.bed);
      return `${g.compare.what} needs ${a.total} pieces on the ${g.compare.againstName} but only ${b.total} on the ${g.short}.`;
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
    <p>Free to split and preview, with no account needed. The bed size is filled in for you.</p>
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
    description: "Build volumes for the Bambu Lab A1, A1 mini, P1S, Creality Ender 3, K1, Prusa MK4 and more, with the largest piece you can print on each and how to split bigger models.",
    body, faq,
  });
}

const out = [["printer-bed-sizes.html", hubPage()], ...GUIDES.map(g => [g.slug + ".html", guidePage(g)])];
for (const [file, html] of out){
  fs.writeFileSync(path.join(ROOT, file), html);
  console.log("wrote", file);
}
