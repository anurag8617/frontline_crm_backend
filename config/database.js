const { Sequelize } = require("sequelize");
require("dotenv").config();

let sequelize;

if (process.env.DATABASE_URL) {
  // Support for Railway/Heroku style connection strings
  sequelize = new Sequelize(process.env.DATABASE_URL, {
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
  });
} else {
  // Support for individual environment variables
  sequelize = new Sequelize(
    process.env.DB_NAME || "frontline_crm",
    process.env.DB_USER || "root",
    process.env.DB_PASS || "",
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
    }
  );
}

module.exports = sequelize;
