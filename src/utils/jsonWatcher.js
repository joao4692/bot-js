const fs = require("fs");
const path = require("path");

// Lista os arquivos JSON que você quer monitorar e usar no bot
const jsonFiles = {
  jobs: path.resolve(__dirname, "../json/rp/jobs.json"),
  // Adicione aqui outros arquivos JSON que você quer monitorar:
  // profiles: path.resolve(__dirname, "../json/rp/profiles.json"),
  // items: path.resolve(__dirname, "../json/rp/items.json"),
};

const jsonData = {};

// Função para carregar ou recarregar um arquivo JSON
function loadJson(key) {
  try {
    delete require.cache[require.resolve(jsonFiles[key])];
    jsonData[key] = require(jsonFiles[key]);
    console.log(`[JSON WATCHER] "${key}" carregado/recarregado com sucesso.`);
  } catch (error) {
    console.error(`[JSON WATCHER] Erro ao carregar "${key}":`, error);
  }
}

// Inicializa os dados e começa a monitorar
function init() {
  for (const key in jsonFiles) {
    loadJson(key);

    // Configura watcher para cada arquivo JSON
    fs.watch(jsonFiles[key], (eventType) => {
      if (eventType === "change") {
        console.log(`[JSON WATCHER] Detectada mudança em "${key}". Recarregando...`);
        loadJson(key);
      }
    });
  }
}

// Função para obter os dados atualizados de qualquer JSON
function getJson(key) {
  return jsonData[key];
}

module.exports = {
  init,
  getJson,
};
