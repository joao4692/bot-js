module.exports = {
  name: 'examplePlugin',
  enabled: true,
  onLoad(client) {
    client.log('LOAD', '[PLUGIN] examplePlugin carregado!');
  },
  onUnload(client) {
    client.log('WARN', '[PLUGIN] examplePlugin descarregado!');
  }
};
