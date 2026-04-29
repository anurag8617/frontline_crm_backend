const express = require("express");
const router = express.Router();

// IMPORTANT: Update these paths if your models are located differently
const EmailLog = require("../models/EmailLog");
const Lead = require("../models/Lead");
const { protect } = require("../middleware/auth");

// Protect all routes with JWT
router.use(protect);

// POST /api/email/send
router.post("/send", async (req, res) => {
  const { to, subject, body, leadId, module: mod } = req.body;

  if (!to || !subject || !body) {
    return res
      .status(400)
      .json({ success: false, message: "to, subject, and body are required." });
  }

  try {
    const wpApiUrl = process.env.WP_EMAIL_API_URL;
    const wpApiKey = process.env.WP_EMAIL_API_KEY;

    if (!wpApiUrl || !wpApiKey) {
      throw new Error("WP_EMAIL_API_URL or WP_EMAIL_API_KEY missing in .env");
    }

    // 1. Send to WordPress API
    const response = await fetch(wpApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${wpApiKey}`,
      },
      body: JSON.stringify({
        to: to,
        subject: subject,
        message: bodyToHtml(body),
        headers: ["Content-Type: text/html; charset=UTF-8"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`WordPress API Error (${response.status}): ${errText}`);
    }

    // 2. Fetch Lead for logging (SEQUELIZE SYNTAX)
    let leadOrg = "";
    if (leadId) {
      const lead = await Lead.findByPk(leadId); // Changed from Mongoose findById
      if (lead) leadOrg = lead.org;
    }

    // 3. Log success in SQL Database (SEQUELIZE SYNTAX)
    const log = await EmailLog.create({
      leadId: leadId || null,
      leadOrg,
      to,
      subject,
      body,
      status: "sent",
      sentBy: req.user.id, // Sequelize uses .id (not ._id like Mongoose)
      sentByName: req.user.displayName,
      module: mod || "",
    });

    res.json({
      success: true,
      message: "Email sent via WP API!",
      logId: log.id,
    });
  } catch (err) {
    console.error("Email send error:", err);

    // 4. Log failure in DB safely
    try {
      if (EmailLog) {
        await EmailLog.create({
          leadId: leadId || null,
          to,
          subject,
          body,
          status: "failed",
          error: err.message,
          sentBy: req.user?.id || null, // Safe fallback
          sentByName: req.user?.displayName || "Unknown",
          module: mod || "",
        });
      }
    } catch (dbErr) {
      console.error("Could not save error to database:", dbErr);
    }

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

    const whereClause = leadId ? { leadId } : {};

    // SEQUELIZE SYNTAX for finding and sorting
    const logs = await EmailLog.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit, 10),
    });

    res.json({ success: true, data: logs, count: logs.length });
  } catch (err) {
    console.error("Fetch logs error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch email logs." });
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
  </div>
</body>
</html>`;
}

module.exports = router;
