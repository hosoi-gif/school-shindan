const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./dataDir');

const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// 全会場で共通の中身（スタート画面文言・質問・コース）。会場ごとのボーナス質問は venueStore 側。
const DEFAULT_CONFIG = require('./defaultConfig');

function ensureFile() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}

function loadConfig() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config) {
  ensureFile();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

module.exports = { loadConfig, saveConfig, DEFAULT_CONFIG };
