// 2026-11-19: Cloudflare Worker a botondrozmann.hu-hoz. CSAK az /api/* kéréseket kapja
// (wrangler.jsonc: run_worker_first), minden más változatlanul a statikus fájlokból (dist) jön.
//
// POST /api/kapcsolat: a Kapcsolat-űrlap. A beküldött üzenetet a Brevo e-mailben továbbítja
// Botondnak (ADMIN_EMAIL). Secret (nem a repóban): BREVO_API_KEY → npx wrangler secret put BREVO_API_KEY

interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> };
  BREVO_API_KEY?: string;
  ADMIN_EMAIL: string;
}

const NEEDS = ["Weboldal", "Webshop", "Arculat", "Meglévő oldal javítása"];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9 ()/-]{7,20}$/;

async function handleContact(req: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // spamcsapda: a rejtett mezőt ember nem tölti ki, és 3 mp alatt senki nem ír üzenetet
  const elapsed = Number(body.elapsed) || 0;
  if (clean(body.website, 200) || elapsed < 3000) return json({ ok: true });

  const name = clean(body.name, 120);
  const contact = clean(body.contact, 160);
  const message = clean(body.message, 4000);
  const needs = Array.isArray(body.needs)
    ? body.needs.filter((n): n is string => typeof n === "string" && NEEDS.includes(n))
    : [];

  const isEmail = EMAIL_RE.test(contact);
  if (!name || !(isEmail || PHONE_RE.test(contact))) return json({ ok: false, error: "invalid" }, 422);

  if (!env.BREVO_API_KEY) {
    console.error("Kapcsolat-űrlap: hiányzik a BREVO_API_KEY secret");
    return json({ ok: false, error: "not_configured" }, 503);
  }

  const rows: [string, string][] = [
    ["Név", esc(name)],
    ["Elérhetőség", esc(contact)],
    ["Mire van szüksége", needs.length ? esc(needs.join(", ")) : "nem jelölte"],
    ["Üzenet", message ? esc(message).replace(/\n/g, "<br>") : "nem írt"],
  ];
  const html =
    `<div style="font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1c1a17;max-width:560px">` +
    `<p>Új üzenet érkezett a botondrozmann.hu Kapcsolat-űrlapjáról.</p>` +
    rows.map(([k, v]) => `<p><span style="color:#6e6860;font-size:14px">${k}</span><br>${v}</p>`).join("") +
    `</div>`;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      // 2026-11-21: a Brevóban csak a gmailes cím hitelesített feladó (a hello@rozmannbotond.hu-t
      // elutasította); ha a botondrozmann.hu domain hitelesítve lesz, ide jöhet egy domaines cím
      sender: { email: env.ADMIN_EMAIL, name: "botondrozmann.hu űrlap" },
      to: [{ email: env.ADMIN_EMAIL }],
      // ha e-mail-címet adott meg, a „Válasz” gomb egyből neki ír
      ...(isEmail ? { replyTo: { email: contact, name } } : {}),
      subject: `Új érdeklődés: ${name}${needs.length ? ` (${needs.join(", ")})` : ""}`,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    console.error("Brevo hiba", res.status, await res.text());
    return json({ ok: false, error: "send_failed" }, 502);
  }
  return json({ ok: true });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/api/kapcsolat") {
      if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
      return handleContact(req, env);
    }
    if (url.pathname.startsWith("/api/")) return json({ ok: false, error: "not_found" }, 404);
    return env.ASSETS.fetch(req);
  },
};
