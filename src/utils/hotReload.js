const fs = require('fs');
const path = require('path');

function hotReload(targetPath, onReload) {
  if (!fs.existsSync(targetPath)) return;
  fs.watch(targetPath, { recursive: true }, (event, filename) => {
    if (!filename.endsWith('.js')) return;
    const fullPath = path.join(targetPath, filename);
    delete require.cache[require.resolve(fullPath)];
    if (onReload) onReload(fullPath);
  });
}

module.exports = { hotReload };
