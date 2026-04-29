const express = require("express");
const router = express.Router();
// Import your new Sequelize models
const EmailLog = require("../models/EmailLog");
const Lead = require("../models/Lead");
const { protect } = require("../middleware/auth");

router.use(protect);

// POST /api/email/send
router.post("/send", async (req, res) => {
  const { to, subject, body, leadId, module: mod } = req.body;

  if (!to || !subject || !body) {
    return res
      .status(400)
      .json({ success: false, message: "to, subject, and body are required." });
  }

  const fromName = process.env.SMTP_FROM_NAME || "Frontline Island Bar & Grill";
  const fromEmail =
    process.env.SMTP_FROM_EMAIL || "frontlineislandbarandgrill1@gmail.com";

  try {
    // Send email using Frontline's Secure WordPress Email API
    const response = await fetch(
      "https://frontlinebar.com/wp-json/secure-email/v1/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WP_EMAIL_API_KEY}`,
        },
        body: JSON.stringify({
          to: to,
          subject: subject,
          message: bodyToHtml(body),
          headers: [`From: ${fromName} <${fromEmail}>`],
        }),
      },
    );

    const responseData = await response.json();

    if (!response.ok || responseData.status !== "success") {
      throw new Error(responseData.message || "WordPress API Error");
    }

    // Sequelize: Find the lead
    let leadOrg = "";
    if (leadId) {
      const lead = await Lead.findByPk(leadId); // Changed from findById
      leadOrg = lead ? lead.org : "";
    }

    // Sequelize: Create the log
    const log = await EmailLog.create({
      leadId: leadId || null,
      leadOrg,
      to,
      subject,
      body,
      status: "sent",
      sentBy: req.user.id, // Changed from req.user._id
      sentByName: req.user.displayName,
      module: mod || "",
    });

    res.json({
      success: true,
      message: "Email queued successfully!",
      logId: log.id,
    });
  } catch (err) {
    console.error("Email send error:", err);

    // Log failure in Sequelize
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

    // Sequelize: Build the where clause
    const whereClause = leadId ? { leadId } : {};

    // Sequelize: Find all with ordering and limit
    const logs = await EmailLog.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    res.json({ success: true, data: logs, count: logs.length });
  } catch (err) {
    console.error("Fetch logs error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch email logs." });
  }
});

// GET /api/email/test — verify API config
router.get("/test", async (req, res) => {
  if (process.env.WP_EMAIL_API_KEY) {
    res.json({
      success: true,
      message: "WordPress Email API configured successfully.",
    });
  } else {
    res
      .status(500)
      .json({ success: false, message: "WP_EMAIL_API_KEY is missing." });
  }
});

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
