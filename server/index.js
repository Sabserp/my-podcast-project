require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const articlesRouter = require('./routes/articles');
const podcastsRouter = require('./routes/podcasts');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure audio output directory exists
const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);

app.use(cors());
app.use(express.json());

// Serve generated audio files statically
app.use('/audio', express.static(audioDir));

app.use('/api/articles', articlesRouter);
app.use('/api/podcasts', podcastsRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/health/elevenlabs', async (req, res) => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || key === 'your_elevenlabs_api_key_here') {
    return res.status(400).json({ ok: false, error: 'No API key set in server/.env' });
  }
  try {
    const axios = require('axios');
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': key },
      timeout: 8000,
    });
    const voiceCount = response.data.voices?.length || 0;
    res.json({
      ok: true,
      message: 'ElevenLabs key is valid and ready',
      available_voices: voiceCount,
    });
  } catch (err) {
    const status = err.response?.status;
    res.status(502).json({
      ok: false,
      error: status === 401 ? 'Invalid API key — check server/.env' : `ElevenLabs error: ${err.message}`,
    });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
