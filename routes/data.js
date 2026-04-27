const express = require("express");
const router = express.Router();
const { Lead, EmailLog, CustomModule, Game } = require("../models");
const { protect } = require("../middleware/auth");

router.use(protect);

// ═══════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════
router.get("/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [leads, emailsSent, modules] = await Promise.all([
      Lead.findAll(),
      EmailLog.count({ where: { status: "sent" } }),
      CustomModule.count(),
    ]);

    const catering = leads.filter(
      (l) => l.module === "catering" || l.module === "both",
    );
    const soccer = leads.filter(
      (l) => l.module === "soccer" || l.module === "both",
    );

    const stats = {
      total: leads.length,
      catering: catering.length,
      soccer: soccer.length,
      booked: leads.filter(
        (l) => l.status === "Booked" || l.status === "Repeat Customer",
      ).length,
      overdue: leads.filter(
        (l) =>
          l.followup &&
          l.followup <= today &&
          l.status !== "Booked" &&
          l.status !== "Not Interested",
      ).length,
      new: leads.filter((l) => l.status === "New").length,
      emailsSent,
      customModules: modules,
      byStatus: {},
      byModule: {
        catering: catering.length,
        soccer: soccer.length,
        both: leads.filter((l) => l.module === "both").length,
      },
    };

    // Status breakdown
    const statuses = [
      "New",
      "Contacted",
      "Follow-up Needed",
      "Quoted",
      "Booked",
      "Repeat Customer",
      "Not Interested",
      "Nurture",
    ];
    statuses.forEach((s) => {
      stats.byStatus[s] = leads.filter((l) => l.status === s).length;
    });

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch stats." });
  }
});

// ═══════════════════════════════════════════
// CUSTOM MODULES
// ═══════════════════════════════════════════
router.get("/modules", async (req, res) => {
  try {
    const mods = await CustomModule.findAll();
    res.json({ success: true, data: mods });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch modules." });
  }
});

router.post("/modules", async (req, res) => {
  try {
    const mod = await CustomModule.create({
      ...req.body,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: mod });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to create module." });
  }
});

router.delete("/modules/:id", async (req, res) => {
  try {
    await CustomModule.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: "Module deleted." });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to delete module." });
  }
});

// ═══════════════════════════════════════════
// CALENDAR / GAMES
// ═══════════════════════════════════════════
router.get("/games", async (req, res) => {
  try {
    const games = await Game.findAll({ order: [["date", "ASC"]] });
    res.json({ success: true, data: games });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch games." });
  }
});

router.post("/games", async (req, res) => {
  try {
    const game = await Game.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: game });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to create event." });
  }
});

router.delete("/games/:id", async (req, res) => {
  try {
    await Game.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: "Event deleted." });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to delete event." });
  }
});

module.exports = router;
