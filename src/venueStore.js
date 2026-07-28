const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR } = require('./dataDir');

const VENUES_FILE = path.join(DATA_DIR, 'venues.json');

function ensureFile() {
  if (!fs.existsSync(VENUES_FILE)) {
    fs.writeFileSync(VENUES_FILE, JSON.stringify({ venues: [] }, null, 2));
  }
}

function loadVenues() {
  ensureFile();
  try {
    const data = JSON.parse(fs.readFileSync(VENUES_FILE, 'utf-8'));
    return data.venues || [];
  } catch {
    return [];
  }
}

function saveVenues(venues) {
  ensureFile();
  fs.writeFileSync(VENUES_FILE, JSON.stringify({ venues }, null, 2));
}

function generateVenueId(existing) {
  const ids = new Set(existing.map((v) => v.id));
  let id;
  do {
    id = crypto.randomBytes(4).toString('hex');
  } while (ids.has(id));
  return id;
}

function listVenues() {
  return loadVenues().map(({ id, name, createdAt, bonusQuestions, mentors }) => ({
    id,
    name,
    createdAt,
    bonusQuestionCount: (bonusQuestions || []).length,
    mentorCount: (mentors || []).length,
  }));
}

function createVenue(name) {
  const venues = loadVenues();
  const venue = {
    id: generateVenueId(venues),
    name: (name && name.trim()) || '無題の会場',
    createdAt: new Date().toISOString(),
    bonusQuestions: [],
    mentors: [],
  };
  venues.push(venue);
  saveVenues(venues);
  return venue;
}

function getVenue(id) {
  const venue = loadVenues().find((v) => v.id === id) || null;
  if (venue && !Array.isArray(venue.mentors)) venue.mentors = [];
  return venue;
}

function updateVenue(id, { name, bonusQuestions, mentors }) {
  const venues = loadVenues();
  const venue = venues.find((v) => v.id === id);
  if (!venue) return null;
  if (typeof name === 'string' && name.trim()) venue.name = name.trim();
  if (Array.isArray(bonusQuestions)) venue.bonusQuestions = bonusQuestions;
  if (Array.isArray(mentors)) venue.mentors = mentors;
  saveVenues(venues);
  return venue;
}

function deleteVenue(id) {
  const venues = loadVenues();
  const next = venues.filter((v) => v.id !== id);
  if (next.length === venues.length) return false;
  saveVenues(next);
  return true;
}

module.exports = { listVenues, createVenue, getVenue, updateVenue, deleteVenue };
