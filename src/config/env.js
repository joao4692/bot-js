module.exports = {
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  env: process.env.NODE_ENV || 'production',
  token: process.env.DISCORD_TOKEN,
  dashboardPort: process.env.DASHBOARD_PORT || 3001
};
