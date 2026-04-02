const express = require('express');
const router = express.Router();
const health = require('../../services/healthMonitor');

router.get('/', (req, res) => {
  res.json(health.getStatus());
});

module.exports = router;
