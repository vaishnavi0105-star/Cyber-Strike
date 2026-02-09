/**
 * Server configuration (env with defaults)
 */
module.exports = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "cyber-strike-dev-secret-change-in-production",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/test",
};
