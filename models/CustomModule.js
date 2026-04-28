const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const CustomModule = sequelize.define(
  "CustomModule",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING,
      defaultValue: "📦",
    },
    desc: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    goal: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    sources: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    channel: {
      type: DataTypes.STRING,
      defaultValue: "Email + Social DM",
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: "#9b59b6",
    },
    createdBy: {
      type: DataTypes.INTEGER,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = CustomModule;
