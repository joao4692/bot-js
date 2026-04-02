module.exports = function errorBoundary(fn) {
  return async function wrapped(...args) {
    try {
      await fn(...args);
    } catch (err) {
      const client = args.find(a => a && a.log);
      if (client && client.log) client.log('ERROR', `Erro capturado pelo errorBoundary: ${err}`);
      else console.error('[errorBoundary]', err);
    }
  };
};
