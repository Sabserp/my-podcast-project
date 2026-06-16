import React, { useState } from 'react';
import ArticleLibrary from './components/ArticleLibrary';
import PodcastPlayer from './components/PodcastPlayer';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('library');
  const [nowPlaying, setNowPlaying] = useState(null);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-icon">🎙️</span>
          <h1>Auditory</h1>
          <span className="header-sub">your news, your ears</span>
        </div>
        <nav className="app-nav">
          <button
            className={activeTab === 'library' ? 'active' : ''}
            onClick={() => setActiveTab('library')}
          >
            Library
          </button>
          <button
            className={activeTab === 'podcasts' ? 'active' : ''}
            onClick={() => setActiveTab('podcasts')}
          >
            Podcasts
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'library' && (
          <ArticleLibrary onGeneratePodcast={(podcast) => {
            setNowPlaying(podcast);
            setActiveTab('podcasts');
          }} />
        )}
        {activeTab === 'podcasts' && (
          <PodcastPlayer nowPlaying={nowPlaying} setNowPlaying={setNowPlaying} />
        )}
      </main>
    </div>
  );
}
