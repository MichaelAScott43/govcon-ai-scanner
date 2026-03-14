import nodemailer from "nodemailer";
import Opportunity from "../models/Opportunity.js";
import EmailPreference from "../models/EmailPreference.js";

function createTransport() {
  const { GMAIL_USER, GMAIL_PASSWORD, SENDGRID_API_KEY, EMAIL_FROM } = process.env;

  if (SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: {
        user: "apikey",
        pass: SENDGRID_API_KEY
      }
    });
  }

  if (GMAIL_USER && GMAIL_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASSWORD
      }
    });
  }

  throw new Error(
    "Email not configured. Set GMAIL_USER + GMAIL_PASSWORD or SENDGRID_API_KEY in your .env file."
  );
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "N/A";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatOpportunitiesHtml(opportunities) {
  if (!opportunities.length) {
    return "<p>No new opportunities matching your profile today.</p>";
  }

  return opportunities
    .map(
      (opp) => `
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
        <h3 style="margin:0 0 8px;color:#1e293b;">
          <a href="${escapeHtml(opp.uiLink || "#")}" style="color:#2563eb;text-decoration:none;">
            ${escapeHtml(opp.title || "Untitled Opportunity")}
          </a>
        </h3>
        <p style="margin:4px 0;color:#64748b;font-size:14px;">
          <strong>Agency:</strong> ${escapeHtml(opp.agency)} |
          <strong>NAICS:</strong> ${escapeHtml(opp.naicsCode)} |
          <strong>Set-Aside:</strong> ${escapeHtml(opp.setAside || "None")}
        </p>
        <p style="margin:4px 0;color:#64748b;font-size:14px;">
          <strong>Posted:</strong> ${escapeHtml(opp.postedDate)} |
          <strong>Response Due:</strong> ${escapeHtml(opp.responseDeadLine)}
        </p>
        ${
          opp.bidScore !== null
            ? `<p style="margin:8px 0 0;"><strong>Bid Score:</strong> ${escapeHtml(opp.bidScore)} / 100 — ${escapeHtml(opp.recommendation)}</p>`
            : ""
        }
      </div>`
    )
    .join("");
}

export async function sendDailyDigest(user) {
  const transport = createTransport();
  const fromAddress = process.env.EMAIL_FROM || process.env.GMAIL_USER || "noreply@govconscanner.com";

  // Fetch opportunities saved by this user
  const prefs = await EmailPreference.findOne({ user: user._id });
  const naicsFilter = prefs?.naicsFilter?.length ? prefs.naicsFilter : null;
  const minScore = prefs?.minBidScore ?? 0;

  const query = { savedBy: user._id };
  if (naicsFilter) query.naicsCode = { $in: naicsFilter };
  if (minScore > 0) query.bidScore = { $gte: minScore };

  const opportunities = await Opportunity.find(query).sort({ postedDate: -1 }).limit(20);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:24px;background:#f8fafc;">
      <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="color:#1e293b;margin:0 0 8px;">GovCon AI Scanner</h1>
        <h2 style="color:#64748b;font-weight:normal;margin:0 0 24px;">Daily Opportunity Digest</h2>
        <p>Hello ${escapeHtml(user.name || user.email)},</p>
        <p>Here are your latest federal contracting opportunities:</p>
        ${formatOpportunitiesHtml(opportunities)}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#94a3b8;font-size:12px;">
          Designed for Non-Classified Use Only. GovCon AI provides preliminary analysis and does not
          replace professional contract review.
        </p>
      </div>
    </body>
    </html>`;

  const info = await transport.sendMail({
    from: `"GovCon AI Scanner" <${fromAddress}>`,
    to: user.email,
    subject: `GovCon AI Daily Digest — ${new Date().toLocaleDateString()}`,
    html
  });

  // Update lastSentAt
  await EmailPreference.findOneAndUpdate(
    { user: user._id },
    { lastSentAt: new Date() },
    { upsert: true }
  );

  return { messageId: info.messageId };
}
