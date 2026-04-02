const express = require('express');
const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;
const logger = require('../utils/logger');

// Middleware
app.use(express.json());

// Rotas
app.use('/status', require('./routes/status'));
// app.use('/nitrado', require('./routes/nitrado'));
// app.use('/nitrado-webhook', require('./routes/nitradoWebhook'));

app.listen(PORT, () => {
  logger.log('LOAD', `[DASHBOARD] Web dashboard rodando em http://localhost:${PORT}/status`);
  logger.log('LOAD', `[NITRADO] API disponível em http://localhost:${PORT}/nitrado`);
  logger.log('LOAD', `[NITRADO] Webhook disponível em http://localhost:${PORT}/nitrado-webhook`);
});
