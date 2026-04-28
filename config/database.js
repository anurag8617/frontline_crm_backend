const { Sequelize } = require("sequelize");
const mysql = require("mysql2/promise");
require("dotenv").config();

/**
 * Sequelize Instance for ORM usage
 */
const sequelize = new Sequelize(
  process.env.DB_NAME || "frontline",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || process.env.DB_PASS || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === "true" ? {
        rejectUnauthorized: false
      } : false
    }
  }
);

/**
 * Raw MySQL2 Promise Connection Pool
 * Use this for direct SQL queries if needed.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || process.env.DB_PASS || "",
  database: process.env.DB_NAME || "frontline",
  ssl: process.env.DB_SSL === "true" ? {
    rejectUnauthorized: false
  } : false,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  sequelize,
  pool
};
