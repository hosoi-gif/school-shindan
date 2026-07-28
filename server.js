require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const path = require('path');
const express = require('express');

const configStore = require('./src/configStore');
const venueStore = require('./src/venueStore');

const app = express();
app.use(express.json());

function requireAdmin(req, res, next) {
  const provided = req.header('x-admin-password') || '';
  const expected = process.env.ADMIN_PASSWORD || 'changeme';
  if (provided !== expected) return res.status(401).json({ ok: false, error: 'unauthorized' });
  next();
}

// ---------- 最上位管理画面（パスワード保護） ----------

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  const expected = process.env.ADMIN_PASSWORD || 'changeme';
  if (password !== expected) return res.status(401).json({ ok: false, error: 'unauthorized' });
  res.json({ ok: true });
});

app.get('/api/config', requireAdmin, (req, res) => {
  res.json({ ok: true, config: configStore.loadConfig() });
});

app.put('/api/config', requireAdmin, (req, res) => {
  const { ui, questions, courses, mentors } = req.body || {};
  if (!ui || !Array.isArray(questions) || !Array.isArray(courses)) {
    return res.status(400).json({ ok: false, error: 'invalid_config' });
  }
  configStore.saveConfig({ ui, questions, courses, mentors: Array.isArray(mentors) ? mentors : [] });
  res.json({ ok: true });
});

app.get('/api/venues', requireAdmin, (req, res) => {
  res.json({ ok: true, venues: venueStore.listVenues() });
});

app.post('/api/venues', requireAdmin, (req, res) => {
  const { name } = req.body || {};
  const venue = venueStore.createVenue(name);
  res.json({ ok: true, venue });
});

app.delete('/api/venues/:venueId', requireAdmin, (req, res) => {
  const deleted = venueStore.deleteVenue(req.params.venueId);
  if (!deleted) return res.status(404).json({ ok: false, error: 'venue_not_found' });
  res.json({ ok: true });
});

// ---------- 会場スコープ（パスワード不要・URLを知っていることが鍵） ----------

app.get('/api/venues/:venueId', (req, res) => {
  const venue = venueStore.getVenue(req.params.venueId);
  if (!venue) return res.status(404).json({ ok: false, error: 'venue_not_found' });
  res.json({ ok: true, venue });
});

app.put('/api/venues/:venueId', (req, res) => {
  const { name, bonusQuestions, mentors } = req.body || {};
  const venue = venueStore.updateVenue(req.params.venueId, { name, bonusQuestions, mentors });
  if (!venue) return res.status(404).json({ ok: false, error: 'venue_not_found' });
  res.json({ ok: true, venue });
});

app.get('/api/venues/:venueId/quiz-config', (req, res) => {
  const venue = venueStore.getVenue(req.params.venueId);
  if (!venue) return res.status(404).json({ ok: false, error: 'venue_not_found' });
  const shared = configStore.loadConfig();
  res.json({
    ok: true,
    config: {
      ui: shared.ui,
      questions: shared.questions,
      courses: shared.courses,
      bonusQuestions: venue.bonusQuestions || [],
      mentors: shared.mentors || [],
      venueMentors: venue.mentors || [],
    },
    venueName: venue.name,
  });
});

// ---------- ページ ----------

const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin', 'index.html')));
app.get('/admin/venues', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin', 'venues.html')));
app.get('/v/:venueId/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'venue-admin.html')));
app.get('/v/:venueId', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'quiz.html')));

app.get('/', (req, res) => res.redirect('/admin'));

const PORT = process.env.PORT || 3101;
app.listen(PORT, () => {
  console.log(`School Shindan server listening on port ${PORT}`);
});
