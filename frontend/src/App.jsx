import React, { useState, useEffect } from 'react';
import { FileAudio, Mic, GraduationCap, History, Settings, Sparkles, Activity } from 'lucide-react';

import FileTranscribeTab from './components/FileTranscribeTab';
import LiveRecordingTab from './components/LiveRecordingTab';
import ClassroomAITab from './components/ClassroomAITab';
import HistoryCopilotTab from './components/HistoryCopilotTab';
import SettingsTab from './components/SettingsTab';
import { fetchHealth } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('file');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isServerOnline, setIsServerOnline] = useState(true);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('phovoice_web_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      provider: 'deepseek',
      url: 'https://api.deepseek.com',
      key: '',
      model: 'deepseek-chat',
    };
  });

  useEffect(() => {
    const checkServer = async () => {
      try {
        await fetchHealth();
        setIsServerOnline(true);
      } catch (e) {
        setIsServerOnline(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('phovoice_web_settings', JSON.stringify(newSettings));
  };

  const navItems = [
    { id: 'file', label: 'Chuyển đổi file', icon: FileAudio },
    { id: 'live', label: 'Thu âm trực tiếp', icon: Mic },
    { id: 'classroom', label: 'Giảng đường AI', icon: GraduationCap },
    { id: 'history', label: 'Lịch sử phiên', icon: History },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Top Navigation Bar ─── */}
      <header className="top-nav">
        <div className="brand">
          <div className="brand-icon-wrapper">
            <Mic size={20} color="#ffffff" />
          </div>
          <span>PhoVoice Web</span>
          <span className="brand-badge">⚡ React 18</span>
        </div>

        {/* Desktop Menu Tabs */}
        <nav className="desktop-menu">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Server Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isServerOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              boxShadow: isServerOnline ? '0 0 10px var(--accent-emerald)' : 'none',
              display: 'inline-block',
            }}
          />
          <span style={{ color: isServerOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 600 }}>
            {isServerOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </header>

      {/* ─── Main Content Views ─── */}
      <main className="app-container">
        {activeTab === 'file' && (
          <FileTranscribeTab onTranscriptReady={(txt) => setCurrentTranscript(txt)} />
        )}

        {activeTab === 'live' && (
          <LiveRecordingTab onTranscriptReady={(txt) => setCurrentTranscript(txt)} />
        )}

        {activeTab === 'classroom' && (
          <ClassroomAITab currentTranscript={currentTranscript} settings={settings} />
        )}

        {activeTab === 'history' && (
          <HistoryCopilotTab
            settings={settings}
            onSelectSession={(txt) => setCurrentTranscript(txt)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab settings={settings} onSaveSettings={handleSaveSettings} />
        )}
      </main>

      {/* ─── Bottom Navigation Bar (Mobile Screens) ─── */}
      <nav className="bottom-nav-mobile">
        {navItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`bottom-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={20} />
              <span>{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
