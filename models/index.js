const User = require("./User");
const Lead = require("./Lead");
const EmailLog = require("./EmailLog");
const CustomModule = require("./CustomModule");
const Game = require("./Game");

// ── User Associations ─────────────────────────────────────────
User.hasMany(Lead, { foreignKey: "createdBy" });
Lead.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

User.hasMany(EmailLog, { foreignKey: "sentBy" });
EmailLog.belongsTo(User, { foreignKey: "sentBy", as: "sender" });

User.hasMany(CustomModule, { foreignKey: "createdBy" });
CustomModule.belongsTo(User, { foreignKey: "createdBy" });

User.hasMany(Game, { foreignKey: "createdBy" });
Game.belongsTo(User, { foreignKey: "createdBy" });

// ── Lead Associations ─────────────────────────────────────────
Lead.hasMany(EmailLog, { foreignKey: "leadId" });
EmailLog.belongsTo(Lead, { foreignKey: "leadId" });

module.exports = {
  User,
  Lead,
  EmailLog,
  CustomModule,
  Game,
};
