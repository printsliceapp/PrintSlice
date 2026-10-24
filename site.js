// Shared behaviour for the inner pages (loaded with defer, after site.css).
(function(){
  // Legal pages: build the margin index from the document's own headings.
  var toc = document.querySelector("[data-toc]");
  if (toc){
    var ol = document.createElement("ol");
    document.querySelectorAll(".legal h2").forEach(function(h, i){
      if (!h.id) h.id = "s" + (i + 1);
      h.classList.add("part");
      var li = document.createElement("li"), a = document.createElement("a"), t = document.createElement("span");
      a.href = "#" + h.id;
      t.textContent = h.textContent.replace(/^\d+\.\s*/, "");
      a.appendChild(t);
      li.appendChild(a);
      ol.appendChild(li);
    });
    toc.appendChild(ol);
    toc.hidden = false;
  }

  // Wide tables stack into rows on phones; each cell keeps its column name.
  document.querySelectorAll("table[data-stack]").forEach(function(table){
    var heads = Array.prototype.map.call(table.querySelectorAll("tr:first-child th"), function(th){ return th.textContent; });
    table.querySelectorAll("tr").forEach(function(tr){
      Array.prototype.forEach.call(tr.children, function(td, i){ if (td.tagName === "TD" && heads[i]) td.setAttribute("data-label", heads[i]); });
    });
  });

  // The margin index marks the section being read.
  var links = Array.prototype.slice.call(document.querySelectorAll(".index a[href^='#']"));
  if (!links.length || !("IntersectionObserver" in window)) return;
  var byId = {};
  links.forEach(function(a){ byId[decodeURIComponent(a.hash.slice(1))] = a; });
  var parts = links.map(function(a){ return document.getElementById(decodeURIComponent(a.hash.slice(1))); }).filter(Boolean);
  var visible = {};
  function mark(){
    var current = null;
    for (var i = 0; i < parts.length; i++){ if (visible[parts[i].id]) { current = parts[i].id; break; } }
    if (!current) return;
    links.forEach(function(a){ if (a === byId[current]) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ visible[e.target.id] = e.isIntersecting; });
    mark();
  }, { rootMargin: "-20% 0px -55% 0px" });
  parts.forEach(function(p){ io.observe(p); });
})();
