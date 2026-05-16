import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const formatCurrency = (value) => `Rs.${Number(value || 0).toFixed(2)}`;

const formatDate = (dateValue) => {
  if (!dateValue) return "Not added";

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildMembershipCardHtml = ({ member, payments, photoUrl }) => {
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const photoMarkup = photoUrl
    ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(member.fullName)}" style="width:96px;height:116px;object-fit:cover;border:1px solid #e2e8f0;border-radius:8px;" />`
    : `<div style="width:96px;height:116px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;color:#94a3b8;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;">${escapeHtml(
        member.fullName?.charAt(0)?.toUpperCase() || "M",
      )}</div>`;

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:720px;margin:0 auto;padding:24px;">
      <div style="overflow:hidden;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff;">
        <div style="background:#0f172a;color:#ffffff;padding:18px 22px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#cbd5e1;">Library Pro</div>
          <div style="margin-top:4px;font-size:24px;font-weight:700;">Membership Card</div>
          <div style="margin-top:4px;font-size:13px;color:#cbd5e1;">View-only member record</div>
        </div>
        <div style="display:flex;gap:18px;padding:22px;align-items:flex-start;">
          ${photoMarkup}
          <div style="flex:1;min-width:0;">
            <div style="font-size:24px;font-weight:700;">${escapeHtml(member.fullName)}</div>
            <div style="margin-top:4px;font-size:13px;color:#64748b;">Member ID: ${escapeHtml(member.id?.slice(0, 8))}</div>
            <table style="width:100%;margin-top:18px;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:7px 0;color:#64748b;">Phone</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(member.phoneNumber)}</td></tr>
              <tr><td style="padding:7px 0;color:#64748b;">Email</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(member.registeredEmail)}</td></tr>
              <tr><td style="padding:7px 0;color:#64748b;">Tier</td><td style="padding:7px 0;font-weight:700;">${member.isFreeTier ? "Free tier" : "Paid member"}</td></tr>
              <tr><td style="padding:7px 0;color:#64748b;">Seat</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(member.seatNumber)} (${escapeHtml(member.seatFloor)} floor)</td></tr>
              <tr><td style="padding:7px 0;color:#64748b;">Locker</td><td style="padding:7px 0;font-weight:700;">${member.isLockerTaken ? "Taken" : "Not taken"}</td></tr>
              <tr><td style="padding:7px 0;color:#64748b;">Registration</td><td style="padding:7px 0;font-weight:700;">${formatDate(member.registrationDate)}</td></tr>
              <tr><td style="padding:7px 0;color:#64748b;">Paid Until</td><td style="padding:7px 0;font-weight:700;">${member.isFreeTier ? "Free tier" : formatDate(member.paidUntil)}</td></tr>
            </table>
          </div>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding:22px;">
          <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:12px;">
            <div style="font-size:16px;font-weight:700;">Payment Records</div>
            <div style="background:#ecfdf5;color:#047857;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700;">Total ${formatCurrency(totalPaid)}</div>
          </div>
          ${
            payments.length === 0
              ? `<div style="border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;padding:14px;color:#64748b;font-size:14px;">No payment records found.</div>`
              : `<table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;">
                  <thead style="background:#f8fafc;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:.04em;">
                    <tr>
                      <th align="left" style="padding:9px;border-bottom:1px solid #e2e8f0;">For</th>
                      <th align="left" style="padding:9px;border-bottom:1px solid #e2e8f0;">Type</th>
                      <th align="left" style="padding:9px;border-bottom:1px solid #e2e8f0;">Method</th>
                      <th align="right" style="padding:9px;border-bottom:1px solid #e2e8f0;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${payments
                      .map(
                        (payment) => `<tr>
                          <td style="padding:9px;border-bottom:1px solid #f1f5f9;">${formatDate(payment.payment_for_month)}</td>
                          <td style="padding:9px;border-bottom:1px solid #f1f5f9;">${escapeHtml(payment.payment_type || "Monthly Fee")}</td>
                          <td style="padding:9px;border-bottom:1px solid #f1f5f9;">${escapeHtml(payment.payment_method)}</td>
                          <td align="right" style="padding:9px;border-bottom:1px solid #f1f5f9;font-weight:700;">${formatCurrency(payment.amount)}</td>
                        </tr>`,
                      )
                      .join("")}
                  </tbody>
                </table>`
          }
        </div>
      </div>
      <div style="padding:14px 4px;color:#64748b;font-size:12px;text-align:center;">This card is view-only. Contact the library admin for any corrections.</div>
    </div>
  </body>
</html>`;
};

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return response.status(405).json({ error: "Method not allowed" });
    }

    const requiredEnv = [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "SMTP_FROM",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    ];
    const missingEnv = requiredEnv.filter((name) => !process.env[name]);

    if (missingEnv.length > 0) {
      return response.status(500).json({ error: `Missing server environment variables: ${missingEnv.join(", ")}` });
    }

    const authHeader = request.headers.authorization || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");

    if (!accessToken) {
      return response.status(401).json({ error: "Missing admin session." });
    }

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return response.status(401).json({ error: "Invalid admin session." });
    }

    const requestBody = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const { member, payments = [], photoUrl = "" } = requestBody;

    if (!member?.registeredEmail) {
      return response.status(400).json({ error: "Member registered email is required." });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: member.registeredEmail,
      subject: "Your Library Membership Card",
      html: buildMembershipCardHtml({ member, payments, photoUrl }),
    });

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error("Failed to send membership card:", error);
    return response.status(500).json({ error: error.message || "Failed to send membership card." });
  }
}
