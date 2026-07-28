const fs = require('fs');
const path = require('path');

// Overridable via DATA_DIR so a Railway Volume (or any persistent disk) can
// be mounted outside the app's own ephemeral filesystem — without it, a
// fresh deploy replaces the container and wipes anything written here.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

module.exports = { DATA_DIR };
