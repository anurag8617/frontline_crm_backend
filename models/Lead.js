const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Lead = sequelize.define(
  "Lead",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    legacyId: {
      type: DataTypes.INTEGER,
    },
    org: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value) {
        this.setDataValue("org", value ? value.trim() : "");
      },
    },
    contact: {
      type: DataTypes.STRING,
      defaultValue: "",
      set(value) {
        this.setDataValue("contact", value ? value.trim() : "");
      },
    },
    email: {
      type: DataTypes.STRING,
      defaultValue: "",
      set(value) {
        this.setDataValue("email", value ? value.toLowerCase().trim() : "");
      },
    },
    phone: {
      type: DataTypes.STRING,
      defaultValue: "",
      set(value) {
        this.setDataValue("phone", value ? value.trim() : "");
      },
    },
    website: {
      type: DataTypes.STRING,
      defaultValue: "",
      set(value) {
        this.setDataValue("website", value ? value.trim() : "");
      },
    },
    social: {
      type: DataTypes.STRING,
      defaultValue: "",
      set(value) {
        this.setDataValue("social", value ? value.trim() : "");
      },
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Church",
    },
    module: {
      type: DataTypes.ENUM("catering", "soccer", "both", "custom"),
      defaultValue: "catering",
    },
    customModule: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    status: {
      type: DataTypes.ENUM(
        "New",
        "Contacted",
        "Follow-up Needed",
        "Quoted",
        "Booked",
        "Repeat Customer",
        "Not Interested",
        "Nurture",
      ),
      defaultValue: "New",
    },
    gamedate: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    followup: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    source: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    notes: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    seqStep: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    seqLabel: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    importDate: {
      type: DataTypes.STRING,
      defaultValue: () => new Date().toISOString().split("T")[0],
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
    },
  },
  {
    timestamps: true,
    indexes: [
      { fields: ["org", "module"] },
      { fields: ["email"] },
      { fields: ["status"] },
      { fields: ["followup"] },
    ],
  },
);

module.exports = Lead;
