/* =============================================================================
 *  Elias Polion Coaching — Newsletter Promo Popup
 * -----------------------------------------------------------------------------
 *  Appears once, ~15s after load. Visitor subscribes → email saved to Brevo
 *  (via your Worker's /subscribe route) → reveals the SUMMIT10 promo code.
 *  Remembered after it's shown, so it never nags on return visits.
 *
 *  ADD TO YOUR SITE: one line before </body>, next to your other scripts:
 *      <script defer src="/promo-popup.js"></script>
 *
 *  Requires the updated worker.js (with the /subscribe route) to be deployed,
 *  plus BREVO_API_KEY (secret) and BREVO_LIST_ID set in the Worker.
 * ========================================================================== */
(function () {
  "use strict";

  var CONFIG = {
    WORKER_URL: "https://coaching-assistant.pfbvtwgpym.workers.dev/subscribe",
    CODE: "SUMMIT10",
    DELAY_MS: 15000,        // 15 seconds
    PLANS_ANCHOR: "#method", // where "Choose a plan" scrolls to
  };

  var SEEN_KEY = "epc_promo_seen";

  // Don't show if already seen (this browser).
  try { if (localStorage.getItem(SEEN_KEY) === "1") return; } catch (e) {}
  if (window.__epcPromoLoaded) return;
  window.__epcPromoLoaded = true;

  function markSeen() { try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) {} }

  var host = document.createElement("div");
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  var fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400&family=Space+Mono&display=swap";
  root.appendChild(fontLink);

  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial}",
    "*{box-sizing:border-box;margin:0;padding:0}",
    ".overlay{position:fixed;inset:0;z-index:2147483600;display:flex;",
    "align-items:center;justify-content:center;padding:20px;",
    "background:rgba(4,4,4,.72);backdrop-filter:blur(6px);",
    "opacity:0;transition:opacity .3s ease}",
    ".overlay.show{opacity:1}",
    ".card{position:relative;width:100%;max-width:420px;",
    "background:linear-gradient(180deg,#141418,#0B0B0D 30%);",
    "border:1px solid rgba(255,255,255,.1);border-radius:20px;",
    "padding:40px 34px 34px;text-align:center;color:#F5F4F2;",
    "box-shadow:0 30px 80px rgba(0,0,0,.6);",
    "transform:translateY(14px) scale(.96);transition:transform .3s cubic-bezier(.2,.8,.2,1)}",
    ".overlay.show .card{transform:none}",
    ".close{position:absolute;top:14px;right:16px;background:transparent;border:none;",
    "color:rgba(245,244,242,.5);font-size:24px;line-height:1;cursor:pointer;",
    "width:30px;height:30px;border-radius:8px;transition:color .15s,background .15s}",
    ".close:hover{color:#F5F4F2;background:rgba(255,255,255,.06)}",
    ".eyebrow{font-family:'Space Mono',monospace;font-size:.5rem;letter-spacing:.35em;",
    "text-transform:uppercase;color:#FF7A3D;margin-bottom:16px}",
    ".title{font-family:'Bebas Neue',sans-serif;font-size:2.6rem;line-height:.95;",
    "letter-spacing:.02em;margin-bottom:14px}",
    ".sub{font-family:'DM Sans',sans-serif;font-weight:300;font-size:.92rem;",
    "line-height:1.6;color:rgba(245,244,242,.55);margin-bottom:26px}",
    "form{display:flex;flex-direction:column;gap:10px}",
    "input{width:100%;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);",
    "border-radius:11px;padding:14px 16px;color:#F5F4F2;font-family:'DM Sans',sans-serif;",
    "font-size:.95rem;outline:none;transition:border-color .2s;text-align:center}",
    "input::placeholder{color:rgba(245,244,242,.3)}",
    "input:focus{border-color:#F2541B}",
    "button.cta{background:linear-gradient(180deg,#FF7A3D,#F2541B);color:#1a0b03;border:none;",
    "border-radius:11px;padding:14px;font-family:'Space Mono',monospace;font-size:.6rem;",
    "letter-spacing:.18em;text-transform:uppercase;cursor:pointer;transition:transform .12s,opacity .2s}",
    "button.cta:hover{transform:translateY(-2px)}",
    "button.cta:disabled{opacity:.5;cursor:default;transform:none}",
    ".status{font-family:'Space Mono',monospace;font-size:.58rem;letter-spacing:.05em;",
    "color:rgba(245,244,242,.6);min-height:1em;margin-top:12px}",
    ".note{font-family:'Space Mono',monospace;font-size:.46rem;letter-spacing:.12em;",
    "text-transform:uppercase;color:rgba(245,244,242,.25);margin-top:16px}",
    /* success view */
    ".code-box{border:1px dashed rgba(255,122,61,.6);border-radius:12px;padding:18px;",
    "margin:6px 0 18px;background:rgba(242,84,27,.06)}",
    ".code{font-family:'Bebas Neue',sans-serif;font-size:2.4rem;letter-spacing:.12em;color:#FF7A3D}",
    ".copy{margin-top:8px;background:transparent;border:1px solid rgba(255,255,255,.15);",
    "color:#F5F4F2;border-radius:8px;padding:7px 14px;font-family:'Space Mono',monospace;",
    "font-size:.52rem;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:border-color .15s}",
    ".copy:hover{border-color:#F2541B}",
    "a.plans{display:inline-block;margin-top:6px;font-family:'Space Mono',monospace;",
    "font-size:.56rem;letter-spacing:.16em;text-transform:uppercase;color:#FF7A3D;text-decoration:none}",
    "a.plans:hover{text-decoration:underline}",
    "@media(max-width:480px){.card{padding:34px 24px 28px}.title{font-size:2.2rem}}"
  ].join("");
  root.appendChild(style);

  var overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML =
    '<div class="card" role="dialog" aria-modal="true" aria-label="Newsletter offer">' +
      '<button class="close" aria-label="Close">&times;</button>' +
      '<div class="view-form">' +
        '<p class="eyebrow">Join the list</p>' +
        '<h2 class="title">10% off your first month</h2>' +
        '<p class="sub">Training insights from the high alpine — and your code, instantly.</p>' +
        '<form id="pf">' +
          '<input id="pe" type="email" placeholder="Your email" required/>' +
          '<button class="cta" id="pb" type="submit">Get my code</button>' +
        '</form>' +
        '<div class="status" id="ps"></div>' +
        '<p class="note">No spam. Unsubscribe anytime.</p>' +
      '</div>' +
      '<div class="view-done" style="display:none">' +
        '<p class="eyebrow">Your code</p>' +
        '<div class="code-box">' +
          '<div class="code" id="pc">' + CONFIG.CODE + '</div>' +
          '<button class="copy" id="pcopy">Copy</button>' +
        '</div>' +
        '<p class="sub">Apply it at checkout for 10% off month one.</p>' +
        '<a class="plans" id="pplans" href="' + CONFIG.PLANS_ANCHOR + '">Choose a plan →</a>' +
      '</div>' +
    '</div>';
  root.appendChild(overlay);

  var card = root.querySelector(".card");
  var closeBtn = root.querySelector(".close");
  var form = root.getElementById("pf");
  var email = root.getElementById("pe");
  var btn = root.getElementById("pb");
  var status = root.getElementById("ps");
  var viewForm = root.querySelector(".view-form");
  var viewDone = root.querySelector(".view-done");
  var copyBtn = root.getElementById("pcopy");
  var plansLink = root.getElementById("pplans");
  var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function open() { overlay.classList.add("show"); }
  function close() { overlay.classList.remove("show"); markSeen(); setTimeout(function(){ host.remove(); }, 300); }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  plansLink.addEventListener("click", function () { markSeen(); setTimeout(close, 50); });

  copyBtn.addEventListener("click", function () {
    try {
      navigator.clipboard.writeText(CONFIG.CODE);
      copyBtn.textContent = "Copied ✓";
      setTimeout(function () { copyBtn.textContent = "Copy"; }, 1800);
    } catch (e) {}
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var val = (email.value || "").trim();
    if (!ok.test(val)) { status.textContent = "Please enter a valid email."; return; }
    btn.disabled = true;
    btn.textContent = "Sending…";
    status.textContent = "";
    try {
      var res = await fetch(CONFIG.WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val })
      });
      var data = await res.json();
      if (data && data.ok) {
        markSeen();
        viewForm.style.display = "none";
        viewDone.style.display = "block";
      } else {
        status.textContent = "Something went wrong — please try again.";
        btn.disabled = false;
        btn.textContent = "Get my code";
      }
    } catch (err) {
      status.textContent = "Network error — please try again.";
      btn.disabled = false;
      btn.textContent = "Get my code";
    }
  });

  // Trigger after the delay.
  setTimeout(open, CONFIG.DELAY_MS);
})();
