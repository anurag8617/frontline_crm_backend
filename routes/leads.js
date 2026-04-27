const express = require("express");
const router = express.Router();
const { Lead } = require("../models");
const { protect } = require("../middleware/auth");
const { Op } = require("sequelize");

// All routes protected
router.use(protect);

// ── GET all leads ─────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { module, status, search } = req.query;
    const filter = {};

    if (module && module !== "all") {
      if (module === "catering") {
        filter[Op.or] = [{ module: "catering" }, { module: "both" }];
      } else if (module === "soccer") {
        filter[Op.or] = [{ module: "soccer" }, { module: "both" }];
      } else {
        filter.module = module;
      }
    }

    if (status) filter.status = status;

    if (search) {
      const searchOr = [
        { org: { [Op.like]: `%${search}%` } },
        { contact: { [Op.like]: `%${search}%` } },
      ];
      if (filter[Op.or]) {
        // Handle existing Op.or from module filter
        const existingOr = filter[Op.or];
        delete filter[Op.or];
        filter[Op.and] = [{ [Op.or]: existingOr }, { [Op.or]: searchOr }];
      } else {
        filter[Op.or] = searchOr;
      }
    }

    const leads = await Lead.findAll({
      where: filter,
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: leads, count: leads.length });
  } catch (err) {
    console.error("Get leads error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch leads." });
  }
});

// ── GET single lead ───────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead)
      return res
        .status(404)
        .json({ success: false, message: "Lead not found." });
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch lead." });
  }
});

// ── POST create lead ──────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const forceCreate = data._forceCreate === true;
    delete data._forceCreate;

    if (!forceCreate) {
      const dupFilter = [];
      if (data.email)
        dupFilter.push({ email: data.email.toLowerCase().trim() });
      if (data.org) {
        const orgFilter = {
          org: data.org.trim(),
        };
        if (data.module && data.module !== "both") {
          orgFilter[Op.or] = [{ module: data.module }, { module: "both" }];
        }
        dupFilter.push(orgFilter);
      }

      if (dupFilter.length) {
        const dup = await Lead.findOne({ where: { [Op.or]: dupFilter } });
        if (dup) {
          return res.status(409).json({
            success: false,
            message: `Duplicate detected: "${dup.org}" already exists.`,
            duplicate: dup,
          });
        }
      }
    }

    const lead = await Lead.create({ ...data, createdBy: req.user.id });
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    console.error("Create lead error:", err);
    res.status(500).json({ success: false, message: "Failed to create lead." });
  }
});

// ── PUT update lead ───────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const [updated] = await Lead.update(req.body, {
      where: { id: req.params.id },
    });
    if (!updated) {
      // Check if it exists but nothing changed
      const lead = await Lead.findByPk(req.params.id);
      if (!lead)
        return res
          .status(404)
          .json({ success: false, message: "Lead not found." });
      return res.json({ success: true, data: lead });
    }
    const lead = await Lead.findByPk(req.params.id);
    res.json({ success: true, data: lead });
  } catch (err) {
    console.error("Update lead error:", err);
    res.status(500).json({ success: false, message: "Failed to update lead." });
  }
});

// ── DELETE lead ───────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Lead.destroy({
      where: { id: req.params.id },
    });
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Lead not found." });
    res.json({ success: true, message: "Lead deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete lead." });
  }
});

// ── POST add note to lead ─────────────────────────────────
router.post("/:id/notes", async (req, res) => {
  try {
    const { text, person, date } = req.body;
    if (!text)
      return res
        .status(400)
        .json({ success: false, message: "Note text is required." });

    const lead = await Lead.findByPk(req.params.id);
    if (!lead)
      return res
        .status(404)
        .json({ success: false, message: "Lead not found." });

    const newNote = {
      text,
      person: person || req.user.displayName,
      date: date || new Date().toISOString().split("T")[0],
    };

    // Re-assign array to trigger Sequelize JSON change detection
    lead.notes = [...(lead.notes || []), newNote];
    await lead.save();

    res.json({ success: true, data: lead });
  } catch (err) {
    console.error("Add note error:", err);
    res.status(500).json({ success: false, message: "Failed to add note." });
  }
});

// ── POST /import/bulk ─────────────────────────────────────
router.post("/import/bulk", async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || !leads.length) {
      return res
        .status(400)
        .json({ success: false, message: "No leads provided." });
    }

    const results = { imported: 0, duplicates: 0, errors: 0, details: [] };

    for (const raw of leads) {
      try {
        const dupFilter = [];
        if (raw.email)
          dupFilter.push({ email: raw.email.toLowerCase().trim() });
        if (raw.org)
          dupFilter.push({
            org: raw.org.trim(),
            module: raw.module || "catering",
          });

        if (dupFilter.length) {
          const dup = await Lead.findOne({ where: { [Op.or]: dupFilter } });
          if (dup) {
            results.duplicates++;
            results.details.push({
              org: raw.org,
              status: "duplicate",
              reason: `Matches existing: ${dup.org}`,
            });
            continue;
          }
        }

        await Lead.create({ ...raw, createdBy: req.user.id });
        results.imported++;
        results.details.push({ org: raw.org, status: "imported" });
      } catch (e) {
        results.errors++;
        results.details.push({
          org: raw.org,
          status: "error",
          reason: e.message,
        });
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error("Bulk import error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to import leads." });
  }
});

module.exports = router;
