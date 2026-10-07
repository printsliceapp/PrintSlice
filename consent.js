// Analytics consent + Microsoft Clarity loader, shared by every page.
//
// Clarity (session replays + heatmaps) sets cookies, which UK/EU rules only
// allow with consent — so its script isn't loaded AT ALL until someone
// clicks Accept. Declining (or ignoring the banner) means nothing loads.
// The choice is remembered in localStorage; printsliceCookieSettings()
// (linked from the privacy policy) lets people change their mind.
(function(){
  // Paste the project ID from clarity.microsoft.com → Settings → Overview.
  // Left empty, this whole file does nothing — no banner, no tracking.
  var CLARITY_PROJECT_ID = "yty21xm2x6";

  var KEY = "printslice_analytics_consent";

  function getChoice(){ try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setChoice(v){ try { localStorage.setItem(KEY, v); } catch (e) {} }

  function loadClarity(){
    (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", CLARITY_PROJECT_ID);
    // Explicit consent signal — without it Clarity runs in its limited,
    // cookieless mode for UK/EU visitors even after loading.
    window.clarity("consent");
  }

  function deleteClarityCookies(){
    ["_clck", "_clsk", "CLID", "MUID", "ANONCHK", "SM", "MR"].forEach(function(name){
      [location.hostname, "." + location.hostname.replace(/^www\./, "")].forEach(function(domain){
        document.cookie = name + "=; Max-Age=0; path=/; domain=" + domain;
      });
      document.cookie = name + "=; Max-Age=0; path=/";
    });
  }

  window.printsliceCookieSettings = function(){
    try { localStorage.removeItem(KEY); } catch (e) {}
    deleteClarityCookies();
    location.reload();
  };

  if (!CLARITY_PROJECT_ID) return;

  var choice = getChoice();
  if (choice === "granted"){ loadClarity(); return; }
  if (choice === "denied") return;

  function showBanner(){
    var bar = document.createElement("div");
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Cookie consent");
    bar.style.cssText = "position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;" +
      "background:#f8fbf0;color:#01161e;border:1px solid rgba(1,22,30,.24);border-radius:9px;" +
      "box-shadow:0 18px 40px -16px rgba(1,22,30,.35);padding:16px 18px;" +
      "font:13.5px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;";
    bar.innerHTML =
      '<p style="margin:0 0 12px">We\'d like to use analytics cookies (Microsoft Clarity) to see how people use PrintSlice, ' +
      'so we can fix what\'s confusing. Anything you type is hidden. ' +
      '<a href="/privacy.html" style="color:#0d3546;text-decoration:underline">Privacy policy</a></p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" data-c="granted" style="cursor:pointer;border:none;border-radius:3px;padding:9px 16px;font-weight:700;font-size:12.5px;font-family:inherit;background:#01161e;color:#f8fbf0">Accept</button>' +
      '<button type="button" data-c="denied" style="cursor:pointer;border:1px solid rgba(1,22,30,.24);border-radius:3px;padding:9px 16px;font-weight:700;font-size:12.5px;font-family:inherit;background:transparent;color:#01161e">Decline</button>' +
      '</div>';
    bar.addEventListener("click", function(e){
      var c = e.target && e.target.getAttribute("data-c");
      if (!c) return;
      setChoice(c);
      bar.remove();
      if (c === "granted") loadClarity();
    });
    document.body.appendChild(bar);
  }

  if (document.body) showBanner();
  else document.addEventListener("DOMContentLoaded", showBanner);
})();
