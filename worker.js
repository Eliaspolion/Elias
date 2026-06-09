/* =============================================================================
 *  Elias Polion Coaching — AI Assistant Backend (100% FREE version)
 *  Cloudflare Worker + Workers AI (Llama). No API key, no bills.
 * -----------------------------------------------------------------------------
 *  HOW IT'S FREE
 *  This runs the AI model on Cloudflare's own free allowance (10,000 Neurons/day,
 *  resets at 00:00 UTC) — plenty for a coaching site. There is NO Anthropic key
 *  and NO Web3Forms key here. Leads still arrive through your existing contact
 *  form on the page; the bot's job is to answer, qualify, and send people there.
 *
 *  DEPLOY WITHOUT ANY LOCAL TOOLS (all in the browser):
 *    1. dash.cloudflare.com → Workers & Pages → Create → Worker → name it
 *       "coaching-assistant" → Deploy.
 *    2. Edit code → paste THIS file → Deploy.
 *    3. Settings → Bindings → Add → "Workers AI" → Variable name: AI → Save.
 *       (This is what makes `env.AI` work. Without it the bot can't run.)
 *    4. Copy the Worker URL (…workers.dev) into chat-widget.js → WORKER_URL.
 *
 *  Edit CONFIG below to change packages, prices, links, or the model.
 * ========================================================================== */

const CONFIG = {
  // Llama 3.3 70B (fast, free, good quality). If you ever hit the daily Neuron
  // limit, switch to the lighter "@cf/meta/llama-3.1-8b-instruct-fast" — it uses
  // far fewer Neurons so you get many more conversations per day.
  MODEL: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  MAX_TOKENS: 600,

  // Front-end origins allowed to call this Worker (CORS). Keep this tight.
  ALLOWED_ORIGINS: [
    "https://eliaspolion.com",
    "https://www.eliaspolion.com",
    // "http://localhost:8080", // for local testing only
  ],

  // Where to send interested visitors (your contact section = the free first call)
  BOOKING_URL: "https://eliaspolion.com/#contact",
  CONTACT_URL: "https://eliaspolion.com/#contact",

  // Your real packages + Stripe checkout links (the bot shares these when asked)
  PACKAGES: [
    {
      name: "Foundation — Performance Science",
      price: "€149/month",
      blurb:
        "biomechanics, metabolic profiling and periodisation science — calibrated, evidence-based progression.",
      link: "https://buy.stripe.com/8x25kD5VYbnP3IFa2ceUU00",
    },
    {
      name: "Adaptive Programming (Most Popular)",
      price: "€249/month",
      blurb:
        "a program that evolves in real time with your recovery markers, life load and competitive goals.",
      link: "https://buy.stripe.com/fZucN5ckmcrTdjf8Y8eUU01",
    },
    {
      name: "Elite Alpine Mental Edge",
      price: "€349/month",
      blurb:
        "focus protocols, stress architecture and psychological resilience from real high-altitude environments.",
      link: "https://buy.stripe.com/fZu5kDfwy4ZrenjgqAeUU02",
    },
  ],

  MAX_HISTORY_MESSAGES: 20,
  MAX_CHARS_PER_MESSAGE: 4000,
};

/* ----------------------------- System prompt ----------------------------- */
function buildSystemPrompt() {
  const packages = CONFIG.PACKAGES.map(
    (p) => `• ${p.name} — ${p.price}: ${p.blurb} Checkout: ${p.link}`
  ).join("\n");

  return `You are the virtual assistant for Elias Polion Coaching, a premium practice for
trail runners, endurance athletes and alpinists. Elias is a professional alpinist,
trail runner and performance coach grounded in sport-human-science. Brand promise:
"Where science meets the summit." Voice: calm, precise, motivating, expert.

# YOUR JOB
1. Warmly answer questions about the coaching, the packages and the philosophy.
2. Qualify visitors conversationally — try to learn, ONE question at a time:
   name, email, main sport, goal race/objective (and date), current weekly training
   volume, experience level (beginner/intermediate/advanced), and which package fits.
3. Move interested people to action: the FREE first consultation, or the right package.

# COACHING PHILOSOPHY (weave in naturally, never dump it all)
Three disciplines, one framework. Performance is built on calibrated training science
(biomechanics, metabolic profiling, periodisation), real-time adaptation to the athlete's
recovery and life load, and the mental architecture of the high alpine (focus, stress,
resilience). Evidence-based, never guesswork — forged in real mountain experience.

# THE PACKAGES (monthly)
${packages}

# HOW TO CONVERSE
- Keep replies short: 2–4 sentences. No markdown headings, no long lists.
- Ask only ONE question at a time so it feels human.
- Use the visitor's first name once you know it. Be specific, never generic.
- When someone is interested, invite them to the free first conversation here:
  ${CONFIG.BOOKING_URL}  (their message there reaches Elias directly).
- If they're ready to commit to a package, share that package's Stripe checkout link.

# HARD SAFETY RULES (never break)
- You are NOT a medical professional. No medical advice. No diagnosing injuries, pain
  or conditions. No treatment, rehab protocols, medication or supplement guidance.
- If someone mentions pain/injury/a medical concern: show empathy, decline to advise,
  and tell them to see a qualified doctor or physiotherapist. Then steer back to goals
  or to booking the free consultation.
- Stay on topic (coaching, training, the mountains, Elias's services). Redirect politely.`;
}

/* --------------------------------- CORS ----------------------------------- */
function corsHeaders(origin) {
  const allowed = CONFIG.ALLOWED_ORIGINS.includes(origin)
    ? origin
    : CONFIG.ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

/* ------------------------------- Validate --------------------------------- */
function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const cleaned = raw
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, CONFIG.MAX_CHARS_PER_MESSAGE),
    }));
  const trimmed = cleaned.slice(-CONFIG.MAX_HISTORY_MESSAGES);
  while (trimmed.length && trimmed[0].role !== "user") trimmed.shift();
  return trimmed.length ? trimmed : null;
}

/* --------------------------------- Entry ---------------------------------- */
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, origin);
    }
    if (!CONFIG.ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "Origin not allowed" }, 403, origin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, origin);
    }

    const history = sanitizeMessages(payload.messages);
    if (!history) return json({ error: "No valid messages" }, 400, origin);

    try {
      // Workers AI expects a system message at the top of the messages array.
      const messages = [
        { role: "system", content: buildSystemPrompt() },
        ...history,
      ];

      const result = await env.AI.run(CONFIG.MODEL, {
        messages,
        max_tokens: CONFIG.MAX_TOKENS,
      });

      const reply =
        (result && result.response && String(result.response).trim()) ||
        "Thanks! For the next step, the first conversation is free — reach Elias " +
          `here: ${CONFIG.BOOKING_URL}`;

      return json({ reply }, 200, origin);
    } catch (err) {
      console.error(err);
      return json(
        {
          reply:
            "Sorry — I'm having a brief technical hiccup. Please try again, or " +
            `reach Elias directly here: ${CONFIG.CONTACT_URL}`,
          error: "ai_error",
        },
        502,
        origin
      );
    }
  },
};
