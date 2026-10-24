// Referral links, loaded by app.html.
//
// 1. Arriving through a /r/<code> link (netlify.toml sends it to
//    app.html?ref=<code>) stores the code in a first-party cookie for 30
//    days. create-checkout-session reads that cookie: a creator's code is
//    applied as a discount, a customer's link gives a 14-day trial.
// 2. Subscribers get a "Give a week, get a week" button in the header with
//    their own link to share.
(function(){
  "use strict";
  const COOKIE = "printslice_ref";
  const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

  const ref = new URLSearchParams(location.search).get("ref");
  if (ref && /^[A-Za-z0-9]{3,24}$/.test(ref)){
    document.cookie = `${COOKIE}=${encodeURIComponent(ref)}; Max-Age=${30*24*3600}; Path=/; SameSite=Lax; Secure`;
    // keep the address bar clean (and stop the code being re-shared by accident)
    const url = new URL(location.href);
    url.searchParams.delete("ref");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function codeFor(userId){
    let n = BigInt("0x" + userId.replace(/-/g, ""));
    let s = "";
    while (n > 0n){ s = B62[Number(n % 62n)] + s; n /= 62n; }
    return "u" + s.padStart(22, "0"); // fixed length: a 128-bit id is at most 22 base-62 digits
  }

  if (typeof sb === "undefined") return;

  let modal = null;
  function openModal(link){
    if (!modal){
      modal = document.createElement("div");
      modal.className = "ppm-overlay";
      modal.innerHTML =
        '<div role="dialog" aria-modal="true" aria-labelledby="referTitle" style="background:var(--paper);border:1px solid var(--line-strong);box-shadow:var(--shadow-lg);width:min(440px,94vw);padding:26px 24px;">' +
          '<h2 id="referTitle" style="font-size:19px;margin:0 0 8px;color:var(--ink);text-transform:none;letter-spacing:0;">Give a week, get a week</h2>' +
          '<p style="font-size:13.5px;color:var(--ink-soft);line-height:1.55;margin:0 0 14px;">Share your link. Your friend gets a <b>14-day free trial</b> instead of 7 days. When they become a paying subscriber, you get <b>a week free</b>, taken off your next bill.</p>' +
          '<div style="display:flex;gap:8px;">' +
            '<input id="referLink" readonly style="flex:1;min-width:0;padding:10px 12px;border:1px solid var(--line-strong);font:13px var(--mono);color:var(--ink);background:var(--field, var(--paper));">' +
            '<button class="btn-primary" id="referCopy" style="width:auto;margin:0;padding:10px 14px;font-size:12.5px;">Copy</button>' +
          '</div>' +
          '<button class="btn-secondary" id="referClose" style="margin-top:12px;">Close</button>' +
          '<p style="font-size:12px;color:var(--ink-faint);margin:10px 0 0;line-height:1.5;">Rewards are added as credit on your account. See the <a href="/terms.html#referrals" target="_blank" rel="noopener">referral terms</a>.</p>' +
        '</div>';
      document.body.appendChild(modal);
      modal.addEventListener("click", e => { if (e.target === modal) modal.hidden = true; });
      modal.querySelector("#referClose").addEventListener("click", () => { modal.hidden = true; });
      modal.querySelector("#referCopy").addEventListener("click", async () => {
        const input = modal.querySelector("#referLink"), btn = modal.querySelector("#referCopy");
        try { await navigator.clipboard.writeText(input.value); btn.textContent = "Copied"; }
        catch (e) { input.select(); btn.textContent = "Press Ctrl+C"; }
        setTimeout(() => { btn.textContent = "Copy"; }, 2000);
      });
    }
    modal.querySelector("#referLink").value = link;
    modal.hidden = false;
  }

  // the header button, only for people with an active or trialling subscription
  let btn = null;
  async function refresh(){
    const { data: { session } } = await sb.auth.getSession();
    let show = false, link = "";
    if (session){
      const { data: sub } = await sb.from("subscriptions").select("status").eq("user_id", session.user.id).maybeSingle();
      show = !!sub && (sub.status === "active" || sub.status === "trialing");
      link = `${location.origin}/r/${codeFor(session.user.id)}`;
    }
    if (show && !btn){
      btn = document.createElement("button");
      btn.className = "btn-secondary";
      btn.id = "referBtn";
      btn.textContent = "Give a week, get a week";
      const anchor = document.getElementById("manageBillingBtn");
      anchor.parentNode.insertBefore(btn, anchor);
    }
    if (btn){
      btn.hidden = !show;
      btn.onclick = () => openModal(link);
    }
  }
  sb.auth.onAuthStateChange(() => { refresh().catch(() => {}); });
  window.addEventListener("storage", e => { if (e.key === "printslice_checkout_done") refresh().catch(() => {}); });
  refresh().catch(() => {});
})();
