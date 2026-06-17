const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns').promises;
const net = require('net');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// SSRF protection: block requests to private/internal IP ranges
function isPrivateIP(ip) {
  const privateRanges = [
    /^127\./,           // loopback
    /^10\./,            // private class A
    /^172\.(1[6-9]|2\d|3[01])\./,  // private class B
    /^192\.168\./,      // private class C
    /^169\.254\./,      // link-local
    /^::1$/,            // IPv6 loopback
    /^fc00:/,           // IPv6 private
    /^fe80:/,           // IPv6 link-local
  ];
  return privateRanges.some(range => range.test(ip));
}

async function validatePublicURL(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are allowed');
  }

  const hostname = parsed.hostname;

  // Block raw IP addresses that are private
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new Error('Requests to private IP addresses are not allowed');
    }
    return;
  }

  // Resolve hostname and check all returned IPs
  const addresses = await dns.lookup(hostname, { all: true });
  for (const { address } of addresses) {
    if (isPrivateIP(address)) {
      throw new Error(`Hostname "${hostname}" resolves to a private IP address`);
    }
  }
}

// Scrape metadata + body text from a URL
async function scrapeArticle(url) {
  const { data: html } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PodcastBot/1.0)' },
    timeout: 10000,
  });

  const $ = cheerio.load(html);

  // Structured metadata
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text() ||
    'Untitled';

  const author =
    $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('[rel="author"]').first().text() ||
    'Unknown';

  const publishedAt =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time').first().attr('datetime') ||
    null;

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';

  const imageUrl =
    $('meta[property="og:image"]').attr('content') || null;

  // Unstructured: raw article body text
  $('script, style, nav, header, footer, aside, [role="complementary"]').remove();
  const bodyText = $('article, [role="main"], main, .article-body, .post-content, .entry-content')
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim() || $('body').text().replace(/\s+/g, ' ').trim();

  return { title, author, publishedAt, description, imageUrl, bodyText };
}

// GET /api/articles
router.get('/', (req, res) => {
  const articles = db.get('articles').orderBy('addedAt', 'desc').value();
  res.json(articles);
});

// POST /api/articles  { url }
router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  // SSRF check — ensure URL resolves to a public address
  try {
    await validatePublicURL(url);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  // Prevent duplicates
  const existing = db.get('articles').find({ url }).value();
  if (existing) return res.status(409).json({ error: 'Article already saved', article: existing });

  try {
    const scraped = await scrapeArticle(url);
    const article = {
      id: uuidv4(),
      url,
      addedAt: new Date().toISOString(),
      // structured fields
      title: scraped.title,
      author: scraped.author,
      publishedAt: scraped.publishedAt,
      description: scraped.description,
      imageUrl: scraped.imageUrl,
      domain: new URL(url).hostname.replace('www.', ''),
      // unstructured field
      bodyText: scraped.bodyText,
    };

    db.get('articles').push(article).write();
    res.status(201).json(article);
  } catch (err) {
    res.status(422).json({ error: 'Failed to scrape article', detail: err.message });
  }
});

// DELETE /api/articles/:id
router.delete('/:id', (req, res) => {
  const article = db.get('articles').find({ id: req.params.id }).value();
  if (!article) return res.status(404).json({ error: 'Not found' });
  db.get('articles').remove({ id: req.params.id }).write();
  res.json({ ok: true });
});

module.exports = router;
