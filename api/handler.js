const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { saveAnswer, getStats } = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Save answer
app.post('/api/answer', async (req, res) => {
  const { answer } = req.body;

  if (!answer || !['yes', 'no'].includes(answer)) {
    return res.status(400).json({ error: 'Invalid answer. Must be "yes" or "no"' });
  }

  const result = await saveAnswer(answer);

  if (result.success) {
    res.json({ message: 'Answer saved successfully', data: result.data });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  const result = await getStats();

  if (result.success) {
    res.json(result.stats);
  } else {
    res.status(500).json({ error: result.error });
  }
});

// Serve static files
app.use(express.static('.'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
