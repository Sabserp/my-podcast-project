import React, { useState, useEffect, useRef } from 'react';
import './PodcastPlayer.css';

export default function PodcastPlayer({ nowPlaying, setNowPlaying }) {
  const [podcasts, setPodcasts] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => { fetchPodcasts(); }, []);

  useEffect(() => {
    if (nowPlaying && audioRef.current) {
      audioRef.current.src = nowPlaying.audioUrl;
      audioRef.current.play();
      setPlaying(true);
    }
  }, [nowPlaying]);

  async function fetchPodcasts() {
    const res = await fetch('/api/podcasts');
    const data = await res.json();
    setPodcasts(data);
  }

  async function deletePodcast(id, e) {
    e.stopPropagation();
    await fetch(`/api/podcasts/${id}`, { method: 'DELETE' });
    if (nowPlaying?.id === id) {
      setNowPlaying(null);
      setPlaying(false);
    }
    fetchPodcasts();
  }

  function selectPodcast(podcast) {
    setNowPlaying(podcast);
    setShowScript(false);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
    setPlaying(!playing);
  }

  function seek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
  }

  function skip(secs) {
    if (audioRef.current) audioRef.current.currentTime += secs;
  }

  function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="player-page">
      {nowPlaying && (
        <div className="now-playing">
          <div className="np-header">
            <div className="np-icon">🎙️</div>
            <div className="np-info">
              <span className="np-label">Now Playing</span>
              <h2 className="np-title">{nowPlaying.title}</h2>
              <p className="np-articles">
                {nowPlaying.articleTitles?.join(' · ')}
              </p>
            </div>
          </div>

          <div className="progress-bar" onClick={seek}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="time-row">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>

          <div className="controls">
            <button onClick={() => skip(-15)}>⏮ 15s</button>
            <button className="play-btn" onClick={togglePlay}>
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={() => skip(30)}>30s ⏭</button>
          </div>

          <button className="script-toggle" onClick={() => setShowScript(s => !s)}>
            {showScript ? 'Hide Script' : 'View Script'}
          </button>

          {showScript && (
            <div className="script-box">
              <pre>{nowPlaying.script}</pre>
            </div>
          )}

          <audio
            ref={audioRef}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onEnded={() => setPlaying(false)}
          />
        </div>
      )}

      <section className="podcast-list-section">
        <h2>All Podcasts <span className="count">{podcasts.length}</span></h2>

        {podcasts.length === 0 ? (
          <div className="empty-state">
            <p>No podcasts yet. Go to Library, select articles, and hit Generate.</p>
          </div>
        ) : (
          <ul className="podcast-list">
            {podcasts.map(p => (
              <li
                key={p.id}
                className={`podcast-card ${nowPlaying?.id === p.id ? 'active' : ''}`}
                onClick={() => selectPodcast(p)}
              >
                <div className="podcast-play-icon">
                  {nowPlaying?.id === p.id && playing ? '⏸' : '▶'}
                </div>
                <div className="podcast-info">
                  <h3>{p.title}</h3>
                  <p className="podcast-meta">
                    <span>{p.articleTitles?.length} {p.articleTitles?.length === 1 ? 'article' : 'articles'}</span>
                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  </p>
                </div>
                <button
                  className="delete-btn"
                  onClick={(e) => deletePodcast(p.id, e)}
                  title="Delete"
                >×</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
