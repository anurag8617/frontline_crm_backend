const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const EmailLog = sequelize.define(
  "EmailLog",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    leadId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Leads",
        key: "id",
      },
    },
    leadOrg: {
      type: DataTypes.STRING,
    },
    to: {
      type: DataTypes.STRING,
    },
    subject: {
      type: DataTypes.STRING,
    },
    body: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.ENUM("sent", "failed"),
      defaultValue: "sent",
    },
    error: {
      type: DataTypes.TEXT,
    },
    sentBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
    },
    sentByName: {
      type: DataTypes.STRING,
    },
    module: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = EmailLog;
