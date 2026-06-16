# Auditory — Journalism to Podcast

Turn your favorite journalism links into audio podcasts using ElevenLabs text-to-speech.

## How it works

1. Paste article URLs into your library — the app scrapes the title, author, date, and full text
2. Select one or more articles and click **Generate Podcast**
3. ElevenLabs converts the content to natural speech — listen in the app

## Tech stack

- **Frontend**: React
- **Backend**: Node.js / Express
- **Database**: lowdb (local JSON file)
- **Audio**: ElevenLabs TTS API
- **Scraping**: axios + cheerio

## Getting started

### Prerequisites

- Node.js v18+
- An [ElevenLabs](https://elevenlabs.io) account and API key

### 1. Install dependencies

```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and add your ElevenLabs API key:

```
ELEVENLABS_API_KEY=your_key_here
```

### 3. Run the app

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Project structure

```
my-podcast-project/
├── client/               # React frontend
│   └── src/
│       ├── App.js
│       └── components/
│           ├── ArticleLibrary.js   # Add & browse articles
│           └── PodcastPlayer.js    # Audio player
├── server/               # Express backend
│   ├── index.js
│   ├── db.js             # lowdb setup
│   ├── audio/            # Generated MP3s (gitignored)
│   └── routes/
│       ├── articles.js   # Scrape & store articles
│       └── podcasts.js   # Generate audio via ElevenLabs
└── README.md
```

## Data model

Each article stores both structured and unstructured data:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `url` | string | Original link |
| `title` | string | Structured — scraped from og:title |
| `author` | string | Structured — scraped from meta |
| `publishedAt` | string | Structured — ISO date |
| `domain` | string | Structured — e.g. nytimes.com |
| `bodyText` | string | Unstructured — raw article body |

## License

MIT
