const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // "Bella" default

// Build a natural-sounding podcast script from one or more articles
function buildScript(articles) {
  const intro = `Welcome to your personalized news podcast. Today we have ${articles.length} ${articles.length === 1 ? 'story' : 'stories'} for you.\n\n`;

  const segments = articles.map((article, i) => {
    const num = ['First', 'Second', 'Third', 'Fourth', 'Fifth'][i] || `Story ${i + 1}`;
    const byline = article.author !== 'Unknown' ? ` by ${article.author}` : '';
    const source = article.domain ? ` from ${article.domain}` : '';
    // Trim body to stay well under free tier 10k character limit
    const body = article.bodyText.slice(0, 1500);
    return `${num} story${byline}${source}: "${article.title}".\n\n${body}`;
  });

  const outro = `\n\nThat's all for today's podcast. Thanks for listening.`;

  return intro + segments.join('\n\n---\n\n') + outro;
}

// GET /api/podcasts
router.get('/', (req, res) => {
  const podcasts = db.get('podcasts').orderBy('createdAt', 'desc').value();
  res.json(podcasts);
});

// POST /api/podcasts/generate  { articleIds: [...] }
router.post('/generate', async (req, res) => {
  const { articleIds } = req.body;
  if (!articleIds || !articleIds.length) {
    return res.status(400).json({ error: 'articleIds array is required' });
  }

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY is not set in .env' });
  }

  const articles = articleIds
    .map(id => db.get('articles').find({ id }).value())
    .filter(Boolean);

  if (!articles.length) {
    return res.status(404).json({ error: 'None of the provided articleIds were found' });
  }

  const script = buildScript(articles);
  const podcastId = uuidv4();
  const audioFilename = `${podcastId}.mp3`;
  const audioPath = path.join(__dirname, '..', 'audio', audioFilename);

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        text: script,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 120000,
      }
    );

    fs.writeFileSync(audioPath, response.data);

    const podcast = {
      id: podcastId,
      title: articles.length === 1
        ? articles[0].title
        : `Podcast — ${new Date().toLocaleDateString()}`,
      articleIds,
      articleTitles: articles.map(a => a.title),
      audioUrl: `/audio/${audioFilename}`,
      script,
      createdAt: new Date().toISOString(),
    };

    db.get('podcasts').push(podcast).write();
    res.status(201).json(podcast);
  } catch (err) {
    let detail = err.message;
    if (err.response) {
      const body = Buffer.isBuffer(err.response.data)
        ? Buffer.from(err.response.data).toString()
        : JSON.stringify(err.response.data);
      detail = `ElevenLabs ${err.response.status}: ${body}`;
    }
    console.error('Podcast generation error:', detail);
    res.status(502).json({ error: 'Audio generation failed', detail });
  }
});

// DELETE /api/podcasts/:id
router.delete('/:id', (req, res) => {
  const podcast = db.get('podcasts').find({ id: req.params.id }).value();
  if (!podcast) return res.status(404).json({ error: 'Not found' });

  const audioPath = path.join(__dirname, '..', 'audio', path.basename(podcast.audioUrl));
  if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

  db.get('podcasts').remove({ id: req.params.id }).write();
  res.json({ ok: true });
});

module.exports = router;
