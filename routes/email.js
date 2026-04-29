const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { EmailLog, Lead } = require("../models");
const { protect } = require("../middleware/auth");

// router.use(protect);

// Create transporter (lazy, so env is loaded first)
let _transporter = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: "gmail", // This tells Nodemailer to automatically configure for Google Mail
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // This MUST be an App Password, not your login password
      },
    });
  }
  return _transporter;
}

// POST /api/email/send
router.post("/send", protect, async (req, res) => {
  const { to, subject, body, leadId, module: mod } = req.body;

  if (!to || !subject || !body) {
    return res
      .status(400)
      .json({ success: false, message: "to, subject, and body are required." });
  }

  const fromName = process.env.SMTP_FROM_NAME || "Frontline Island Bar & Grill";
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: body,
      html: bodyToHtml(body),
    });

    // Log it
    let leadOrg = "";
    if (leadId) {
      const lead = await Lead.findByPk(leadId);
      leadOrg = lead?.org || "";
    }

    const log = await EmailLog.create({
      leadId: leadId || null,
      leadOrg,
      to,
      subject,
      body,
      status: "sent",
      sentBy: req.user.id,
      sentByName: req.user.displayName,
      module: mod || "",
    });

    res.json({
      success: true,
      message: "Email sent successfully!",
      logId: log.id,
    });
  } catch (err) {
    console.error("Email send error:", err);

    // Log failure
    try {
      await EmailLog.create({
        leadId: leadId || null,
        to,
        subject,
        body,
        status: "failed",
        error: err.message,
        sentBy: req.user.id,
        sentByName: req.user.displayName,
        module: mod || "",
      });
    } catch (_) {}

    res.status(500).json({
      success: false,
      message: `Failed to send email: ${err.message}`,
    });
  }
});

// GET /api/email/logs — get sent email history
router.get("/logs", async (req, res) => {
  try {
    const { leadId, limit = 50 } = req.query;
    const where = leadId ? { leadId } : {};
    const logs = await EmailLog.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });
    res.json({ success: true, data: logs, count: logs.length });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch email logs." });
  }
});

// GET /api/email/test — verify SMTP config
router.get("/test", async (req, res) => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    res.json({
      success: true,
      message: "SMTP connection verified successfully.",
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: `SMTP test failed: ${err.message}` });
  }
});

// Helper: convert plain text to simple HTML
function bodyToHtml(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;">
  <div style="background:white;padding:30px;border-radius:8px;border-top:4px solid #00b4a0;">
    <div style="white-space:pre-line;font-size:14px;line-height:1.7;color:#333;">${escaped}</div>
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee;"/>
    <div style="font-size:12px;color:#888;">Sent via Frontline Island Bar & Grill CRM</div>
  </div>
</body>
</html>`;
}

module.exports = router;
