/* =============================================================================
 *  Elias Polion Coaching — AI Assistant + Newsletter Backend (100% FREE)
 *  Cloudflare Worker + Workers AI (chat) + Brevo (newsletter signups)
 * -----------------------------------------------------------------------------
 *  TWO JOBS, ONE WORKER:
 *   • POST /            → the AI chatbot (Llama on Workers AI, free)
 *   • POST /subscribe   → adds an email to your Brevo newsletter list
 *
 *  SECRET (add in the Cloudflare dashboard, NOT in this file):
 *   • BREVO_API_KEY     your Brevo key (starts with xkeysib-)
 *     Worker → Settings → Variables and Secrets → Add → type "Secret" →
 *     name BREVO_API_KEY → paste the key → Save and deploy.
 *
 *  Then set BREVO_LIST_ID below to your Brevo list number.
 * ========================================================================== */

const CONFIG = {
  MODEL: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  MAX_TOKENS: 600,

  ALLOWED_ORIGINS: [
    "https://eliaspolion.com",
    "https://www.eliaspolion.com",
  ],

  // Booking + contact links
  BOOKING_URL: "https://calendly.com/eliaspolion/30min",
  CONTACT_URL: "https://eliaspolion.com/#contact",

  // 🔧 NEWSLETTER: replace 2 with YOUR Brevo list ID (a small number)
  BREVO_LIST_ID: 3,

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
  ${CONFIG.BOOKING_URL}  (they can book a video call directly).
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

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/* ------------------------------ Chat handler ------------------------------ */
async function handleChat(payload, env, origin) {
  const history = sanitizeMessages(payload.messages);
  if (!history) return json({ error: "No valid messages" }, 400, origin);

  try {
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
      "Thanks! For the next step, the first conversation is free — book here: " +
        CONFIG.BOOKING_URL;

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
}

/* --------------------------- Subscribe handler ---------------------------- */
async function handleSubscribe(payload, env, origin) {
  const email = (payload.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return json({ ok: false, error: "invalid_email" }, 400, origin);
  }
  if (!env.BREVO_API_KEY) {
    return json({ ok: false, error: "not_configured" }, 500, origin);
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        listIds: [CONFIG.BREVO_LIST_ID],
        updateEnabled: true, // don't error if they're already a contact
      }),
    });

    // Brevo returns 201 (created) or 204 (updated) on success.
    if (res.ok || res.status === 204) {
      return json({ ok: true }, 200, origin);
    }

    const detail = await res.text();
    console.error("Brevo error", res.status, detail);
    return json({ ok: false, error: "provider_error" }, 502, origin);
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: "network_error" }, 502, origin);
  }
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

    // Route by path: /subscribe → newsletter, anything else → chat
    const path = new URL(request.url).pathname;
    if (path.endsWith("/subscribe")) {
      return handleSubscribe(payload, env, origin);
    }
    return handleChat(payload, env, origin);
  },
};
