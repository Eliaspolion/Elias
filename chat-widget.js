/* =============================================================================
 *  Elias Polion Coaching — AI Assistant Widget
 * -----------------------------------------------------------------------------
 *  Drop-in chatbot for a static site. One <script> tag, zero dependencies.
 *  Renders in a Shadow DOM so it never collides with your site's CSS/animations.
 *
 *  ADD TO YOUR SITE: one line before </body> on index.html
 *      <script defer src="/chat-widget.js"></script>
 *
 *  THEN set WORKER_URL below to your deployed Cloudflare Worker URL.
 *
 *  HIDE BEHAVIOUR:
 *   • × in the chat header  → collapses the chat back to the floating button.
 *   • "Hide assistant" (in the chat) or the small ✕ on the button → removes the
 *     button entirely for this browsing session. It comes back on the visitor's
 *     next visit (new session), so you never permanently lose the assistant.
 * ========================================================================== */
(function () {
  "use strict";

  if (window.__epcChatLoaded) return;
  window.__epcChatLoaded = true;

  const CONFIG = {
    // 🔧 REQUIRED: your deployed Worker endpoint
    WORKER_URL: "https://coaching-assistant.pfbvtwgpym.workers.dev",

    title: "Coaching Assistant",
    subtitle: "Elias Polion · Endurance & Mountain",

    greeting:
      "Welcome. I'm Elias's coaching assistant — here to talk training, the mountains, and how we work. What's your main goal right now?",

    quickReplies: [
      "Explore coaching packages",
      "Book a free consultation",
      "What's your coaching philosophy?",
      "I'm training for a race",
    ],

    disclaimer: "Not medical advice. For injuries, consult a healthcare professional.",

    tokens: {
      accent: "#F2541B",
      accentSoft: "#FF7A3D",
      panelBg: "#0B0B0D",
      panelBg2: "#141418",
      stroke: "rgba(255,255,255,0.08)",
      textHi: "#F5F4F2",
      textLo: "#9A9AA2",
      userBubble: "#F2541B",
      botBubble: "#1B1B20",
      fontDisplay: "'Bricolage Grotesque', system-ui, sans-serif",
      fontBody: "'Hanken Grotesk', system-ui, sans-serif",
    },
  };

  const STORAGE_KEY = "epc_chat_history";
  const HIDDEN_KEY = "epc_chat_hidden";

  // If the visitor hid the assistant earlier this session, do nothing at all.
  try {
    if (sessionStorage.getItem(HIDDEN_KEY) === "1") return;
  } catch (_) {}

  const SUMMIT_SVG =
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" aria-hidden="true">' +
    '<path d="M2 20 L9 8 L13 14 L16 9 L22 20 Z" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linejoin="round"/><path d="M9 8 L11 11 L13 9" stroke="currentColor" ' +
    'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/></svg>';

  /* ------------------------------ host + shadow ------------------------------ */
  const host = document.createElement("div");
  host.id = "epc-chat-root";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Hanken+Grotesk:wght@400;500;600&display=swap";
  root.appendChild(fontLink);

  /* ---------------------------------- styles --------------------------------- */
  const style = document.createElement("style");
  const t = CONFIG.tokens;
  style.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .wrap {
      position: fixed; bottom: 22px; right: 22px; z-index: 2147483000;
      font-family: ${t.fontBody}; color: ${t.textHi};
    }
    .wrap.gone { display: none; }

    /* Launcher */
    .launcher {
      width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer;
      position: relative; display: grid; place-items: center;
      background: radial-gradient(120% 120% at 30% 25%, ${t.panelBg2}, ${t.panelBg});
      box-shadow: 0 10px 30px rgba(0,0,0,.45), inset 0 0 0 1px ${t.stroke};
      transition: transform .25s cubic-bezier(.2,.8,.2,1);
    }
    .launcher:hover { transform: translateY(-3px) scale(1.04); }
    .launcher:active { transform: scale(.96); }
    .launcher .mark { width: 28px; height: 28px; color: ${t.accent}; }
    .launcher::after {
      content: ""; position: absolute; inset: -4px; border-radius: 50%;
      border: 1.5px solid ${t.accent}; opacity: .55;
      animation: pulse 2.6s ease-out infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: .55; }
      70% { transform: scale(1.35); opacity: 0; }
      100% { opacity: 0; }
    }

    /* Small ✕ on the launcher to dismiss it entirely (desktop hover/focus) */
    .launcher-dismiss {
      position: absolute; top: -6px; right: -6px; width: 22px; height: 22px;
      border-radius: 50%; border: 1px solid ${t.stroke}; cursor: pointer;
      background: ${t.panelBg2}; color: ${t.textLo}; font-size: 14px; line-height: 1;
      display: grid; place-items: center; opacity: 0; transform: scale(.6);
      transition: opacity .15s, transform .15s, color .15s; z-index: 1;
    }
    .launcher:hover .launcher-dismiss,
    .launcher:focus-within .launcher-dismiss,
    .launcher-dismiss:focus { opacity: 1; transform: scale(1); }
    .launcher-dismiss:hover { color: ${t.textHi}; border-color: ${t.accent}; }

    /* Panel */
    .panel {
      position: absolute; bottom: 76px; right: 0;
      width: 380px; max-width: calc(100vw - 32px);
      height: 600px; max-height: calc(100vh - 120px);
      display: flex; flex-direction: column; overflow: hidden;
      background: linear-gradient(180deg, ${t.panelBg2} 0%, ${t.panelBg} 22%);
      border: 1px solid ${t.stroke}; border-radius: 22px;
      box-shadow: 0 24px 70px rgba(0,0,0,.6);
      transform-origin: bottom right;
      opacity: 0; transform: translateY(12px) scale(.96); pointer-events: none;
      transition: opacity .22s ease, transform .22s cubic-bezier(.2,.8,.2,1);
    }
    .panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }

    /* Header */
    .head {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 18px; border-bottom: 1px solid ${t.stroke};
      background: rgba(255,255,255,0.015);
    }
    .head .badge {
      width: 38px; height: 38px; border-radius: 11px; flex: none;
      display: grid; place-items: center; color: ${t.accent};
      background: ${t.panelBg2}; box-shadow: inset 0 0 0 1px ${t.stroke};
    }
    .head .badge svg { width: 22px; height: 22px; }
    .head .meta { flex: 1; min-width: 0; }
    .head .title {
      font-family: ${t.fontDisplay}; font-weight: 700; font-size: 15px;
      letter-spacing: .2px; line-height: 1.1;
    }
    .head .sub {
      font-size: 11.5px; color: ${t.textLo}; margin-top: 3px;
      display: flex; align-items: center; gap: 6px; text-transform: uppercase;
      letter-spacing: .6px;
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #35d07f;
      box-shadow: 0 0 0 3px rgba(53,208,127,.18); }
    .close {
      border: none; background: transparent; color: ${t.textLo}; cursor: pointer;
      width: 30px; height: 30px; border-radius: 8px; font-size: 20px; line-height: 1;
      transition: background .15s, color .15s;
    }
    .close:hover { background: rgba(255,255,255,.06); color: ${t.textHi}; }

    /* Messages */
    .log {
      flex: 1; overflow-y: auto; padding: 18px; display: flex;
      flex-direction: column; gap: 12px; scroll-behavior: smooth;
    }
    .log::-webkit-scrollbar { width: 8px; }
    .log::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 8px; }

    .row { display: flex; }
    .row.user { justify-content: flex-end; }
    .bubble {
      max-width: 84%; padding: 11px 14px; font-size: 14px; line-height: 1.5;
      border-radius: 16px; word-wrap: break-word; overflow-wrap: anywhere;
      animation: rise .28s ease both;
    }
    .row.bot .bubble {
      background: ${t.botBubble}; color: ${t.textHi};
      border: 1px solid ${t.stroke}; border-bottom-left-radius: 5px;
    }
    .row.user .bubble {
      background: linear-gradient(180deg, ${t.accentSoft}, ${t.userBubble});
      color: #1a0b03; font-weight: 500; border-bottom-right-radius: 5px;
    }
    .bubble a { color: inherit; font-weight: 600; text-underline-offset: 2px; }
    .row.bot .bubble a { color: ${t.accentSoft}; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

    /* Typing */
    .typing { display: inline-flex; gap: 4px; padding: 14px 16px; }
    .typing span {
      width: 7px; height: 7px; border-radius: 50%; background: ${t.textLo};
      animation: blink 1.2s infinite both;
    }
    .typing span:nth-child(2) { animation-delay: .2s; }
    .typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes blink { 0%,80%,100% { opacity: .25; } 40% { opacity: 1; } }

    /* Quick replies */
    .chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 18px 4px; }
    .chip {
      font-family: ${t.fontBody}; font-size: 12.5px; color: ${t.textHi};
      padding: 8px 13px; border-radius: 999px; cursor: pointer;
      background: rgba(255,255,255,.04); border: 1px solid ${t.stroke};
      transition: border-color .15s, background .15s, transform .1s;
    }
    .chip:hover { border-color: ${t.accent}; background: rgba(242,84,27,.1); }
    .chip:active { transform: scale(.97); }

    /* Composer */
    .composer { padding: 12px 14px 8px; border-top: 1px solid ${t.stroke}; }
    .field {
      display: flex; align-items: flex-end; gap: 8px;
      background: ${t.panelBg2}; border: 1px solid ${t.stroke};
      border-radius: 14px; padding: 6px 6px 6px 14px; transition: border-color .15s;
    }
    .field:focus-within { border-color: ${t.accent}; }
    textarea {
      flex: 1; resize: none; border: none; outline: none; background: transparent;
      color: ${t.textHi}; font-family: ${t.fontBody}; font-size: 14px;
      line-height: 1.45; max-height: 120px; padding: 7px 0;
    }
    textarea::placeholder { color: ${t.textLo}; }
    .send {
      flex: none; width: 38px; height: 38px; border-radius: 11px; border: none;
      cursor: pointer; display: grid; place-items: center; color: #1a0b03;
      background: linear-gradient(180deg, ${t.accentSoft}, ${t.accent});
      transition: transform .12s, opacity .15s;
    }
    .send:hover { transform: scale(1.06); }
    .send:disabled { opacity: .4; cursor: not-allowed; transform: none; }
    .send svg { width: 18px; height: 18px; }

    /* Footer row: disclaimer + hide link */
    .foot {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 8px 6px 4px;
    }
    .fine { font-size: 10.5px; color: ${t.textLo}; line-height: 1.4; flex: 1; }
    .hide-btn {
      flex: none; font-family: ${t.fontBody}; font-size: 11px; color: ${t.textLo};
      background: transparent; border: none; cursor: pointer; padding: 4px 6px;
      border-radius: 6px; white-space: nowrap; transition: color .15s, background .15s;
    }
    .hide-btn:hover { color: ${t.textHi}; background: rgba(255,255,255,.05); }

    /* Mobile: bottom sheet */
    @media (max-width: 480px) {
      .wrap { bottom: 16px; right: 16px; }
      .panel {
        width: 100vw; height: 88vh; max-height: 88vh; right: -16px; bottom: 72px;
        border-radius: 22px 22px 0 0;
      }
      /* On touch there's no hover, so keep the launcher ✕ always visible */
      .launcher-dismiss { opacity: 1; transform: scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      *, .panel, .bubble, .launcher { animation: none !important; transition: none !important; }
    }
  `;
  root.appendChild(style);

  /* ---------------------------------- markup --------------------------------- */
  const wrap = document.createElement("div");
  wrap.className = "wrap";
  wrap.innerHTML = `
    <div class="panel" role="dialog" aria-modal="false" aria-label="Coaching assistant chat">
      <div class="head">
        <div class="badge">${SUMMIT_SVG}</div>
        <div class="meta">
          <div class="title">${CONFIG.title}</div>
          <div class="sub"><span class="dot"></span>${CONFIG.subtitle}</div>
        </div>
        <button class="close" aria-label="Minimise chat">&times;</button>
      </div>
      <div class="log" aria-live="polite"></div>
      <div class="chips"></div>
      <div class="composer">
        <div class="field">
          <textarea rows="1" placeholder="Type your message…" aria-label="Message"></textarea>
          <button class="send" aria-label="Send message" disabled>
            <svg viewBox="0 0 24 24" fill="none"><path d="M4 12 L20 4 L13 20 L11 13 Z"
              fill="currentColor"/></svg>
          </button>
        </div>
        <div class="foot">
          <div class="fine">${CONFIG.disclaimer}</div>
          <button class="hide-btn" aria-label="Hide the assistant button">Hide assistant</button>
        </div>
      </div>
    </div>
    <button class="launcher" aria-label="Open coaching assistant" aria-expanded="false">
      <span class="mark">${SUMMIT_SVG}</span>
      <span class="launcher-dismiss" role="button" tabindex="0"
        aria-label="Hide the assistant button" title="Hide assistant">&times;</span>
    </button>
  `;
  root.appendChild(wrap);

  /* --------------------------------- refs ----------------------------------- */
  const $ = (s) => root.querySelector(s);
  const panel = $(".panel");
  const launcher = $(".launcher");
  const dismiss = $(".launcher-dismiss");
  const closeBtn = $(".close");
  const hideBtn = $(".hide-btn");
  const log = $(".log");
  const chipsBox = $(".chips");
  const input = $("textarea");
  const sendBtn = $(".send");

  /* --------------------------------- state ---------------------------------- */
  let history = [];
  let busy = false;
  let seeded = false;

  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) history = JSON.parse(saved) || [];
  } catch (_) {}

  function persist() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch (_) {}
  }

  /* -------------------------------- helpers --------------------------------- */
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }
  function linkify(s) {
    return escapeHtml(s).replace(
      /(https?:\/\/[^\s<]+?)([.,;:!?]*)(?=\s|$|&)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>$2'
    );
  }
  function scrollDown() { log.scrollTop = log.scrollHeight; }

  function addBubble(role, text) {
    const row = document.createElement("div");
    row.className = "row " + (role === "user" ? "user" : "bot");
    const b = document.createElement("div");
    b.className = "bubble";
    b.innerHTML = linkify(text);
    row.appendChild(b);
    log.appendChild(row);
    scrollDown();
  }

  function showTyping() {
    const row = document.createElement("div");
    row.className = "row bot";
    row.id = "epc-typing";
    row.innerHTML = '<div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div>';
    log.appendChild(row);
    scrollDown();
  }
  function hideTyping() {
    const el = root.getElementById("epc-typing");
    if (el) el.remove();
  }

  function renderChips() {
    chipsBox.innerHTML = "";
    if (history.length > 1) return;
    CONFIG.quickReplies.forEach((label) => {
      const c = document.createElement("button");
      c.className = "chip";
      c.textContent = label;
      c.addEventListener("click", () => send(label));
      chipsBox.appendChild(c);
    });
  }

  function seedGreeting() {
    if (seeded) return;
    seeded = true;
    if (history.length === 0) {
      history.push({ role: "assistant", content: CONFIG.greeting });
      persist();
    }
    history.forEach((m) => addBubble(m.role === "user" ? "user" : "bot", m.content));
    renderChips();
  }

  /* --------------------------------- send ----------------------------------- */
  async function send(text) {
    const msg = (text || input.value).trim();
    if (!msg || busy) return;

    busy = true;
    input.value = "";
    input.style.height = "auto";
    sendBtn.disabled = true;

    addBubble("user", msg);
    history.push({ role: "user", content: msg });
    persist();
    renderChips();
    showTyping();

    try {
      const res = await fetch(CONFIG.WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      hideTyping();
      const reply = data.reply || "Sorry, something went wrong — please try again.";
      addBubble("bot", reply);
      history.push({ role: "assistant", content: reply });
      persist();
    } catch (err) {
      hideTyping();
      addBubble(
        "bot",
        "I couldn't reach the server. Please try again in a moment, or use the contact form on this page."
      );
    } finally {
      busy = false;
      input.focus();
    }
  }

  /* ----------------------------- open / close / hide ------------------------- */
  function openPanel() {
    panel.classList.add("open");
    launcher.setAttribute("aria-expanded", "true");
    seedGreeting();
    setTimeout(() => input.focus(), 120);
  }
  function closePanel() {
    panel.classList.remove("open");
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }
  function hideWidget() {
    try { sessionStorage.setItem(HIDDEN_KEY, "1"); } catch (_) {}
    wrap.classList.add("gone");
    // Fully remove from the page after the click settles.
    setTimeout(() => host.remove(), 50);
  }

  /* --------------------------------- events --------------------------------- */
  launcher.addEventListener("click", () =>
    panel.classList.contains("open") ? closePanel() : openPanel()
  );
  closeBtn.addEventListener("click", closePanel);
  hideBtn.addEventListener("click", hideWidget);

  // Launcher ✕ — dismiss without opening the chat
  dismiss.addEventListener("click", (e) => { e.stopPropagation(); hideWidget(); });
  dismiss.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); hideWidget(); }
  });

  sendBtn.addEventListener("click", () => send());

  input.addEventListener("input", () => {
    sendBtn.disabled = input.value.trim() === "";
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("open")) closePanel();
  });
})();
