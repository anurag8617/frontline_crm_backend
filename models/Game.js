const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Game = sequelize.define(
  "Game",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.STRING,
    },
    time: {
      type: DataTypes.STRING,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    createdBy: {
      type: DataTypes.INTEGER,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = Game;
