import React, { useState, useEffect } from 'react';
import './ArticleLibrary.css';

export default function ArticleLibrary({ onGeneratePodcast }) {
  const [articles, setArticles] = useState([]);
  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchArticles(); }, []);

  async function fetchArticles() {
    const res = await fetch('/api/articles');
    const data = await res.json();
    setArticles(data);
  }

  async function addArticle(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add article');
      setUrl('');
      fetchArticles();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteArticle(id) {
    await fetch(`/api/articles/${id}`, { method: 'DELETE' });
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
    fetchArticles();
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  async function generatePodcast() {
    if (!selected.size) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/podcasts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setSelected(new Set());
      onGeneratePodcast(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="library">
      <section className="add-section">
        <h2>Add Article</h2>
        <form className="add-form" onSubmit={addArticle}>
          <input
            type="url"
            placeholder="Paste a journalism link — NYT, The Atlantic, Reuters…"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={loading}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Fetching…' : 'Add'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="articles-section">
        <div className="section-header">
          <h2>Your Library <span className="count">{articles.length}</span></h2>
          {selected.size > 0 && (
            <button
              className="generate-btn"
              onClick={generatePodcast}
              disabled={generating}
            >
              {generating
                ? '⏳ Generating…'
                : `🎙️ Generate Podcast (${selected.size})`}
            </button>
          )}
        </div>

        {articles.length === 0 ? (
          <div className="empty-state">
            <p>No articles yet. Paste a link above to get started.</p>
          </div>
        ) : (
          <ul className="article-list">
            {articles.map(article => (
              <li
                key={article.id}
                className={`article-card ${selected.has(article.id) ? 'selected' : ''}`}
                onClick={() => toggleSelect(article.id)}
              >
                <div className="article-check">
                  {selected.has(article.id) ? '✓' : ''}
                </div>
                {article.imageUrl && (
                  <img
                    className="article-thumb"
                    src={article.imageUrl}
                    alt=""
                    onError={e => e.target.style.display = 'none'}
                  />
                )}
                <div className="article-info">
                  <span className="article-domain">{article.domain}</span>
                  <h3 className="article-title">{article.title}</h3>
                  <p className="article-meta">
                    {article.author !== 'Unknown' && <span>{article.author}</span>}
                    {article.publishedAt && (
                      <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                    )}
                    <span>{Math.ceil(article.bodyText.split(' ').length / 200)} min read</span>
                  </p>
                  {article.description && (
                    <p className="article-desc">{article.description}</p>
                  )}
                </div>
                <button
                  className="delete-btn"
                  onClick={e => { e.stopPropagation(); deleteArticle(article.id); }}
                  title="Remove"
                >×</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
