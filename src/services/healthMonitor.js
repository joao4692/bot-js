const os = require('os');

module.exports = {
  getStatus() {
    const mem = process.memoryUsage();
    return {
      status: 'ok',
      uptime: process.uptime(),
      ram: (mem.rss / 1024 / 1024).toFixed(1),
      platform: os.platform(),
      arch: os.arch(),
      pid: process.pid,
      hostname: os.hostname(),
      timestamp: Date.now(),
      cpu: os.loadavg(),
      totalmem: (os.totalmem() / 1024 / 1024).toFixed(1),
      freemem: (os.freemem() / 1024 / 1024).toFixed(1)
    };
  }
};
