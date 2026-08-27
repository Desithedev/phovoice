import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, Key, Globe, Cpu } from 'lucide-react';

export default function SettingsTab({ settings, onSaveSettings }) {
  const [provider, setProvider] = useState(settings.provider || 'deepseek');
  const [url, setUrl] = useState(settings.url || 'https://api.deepseek.com');
  const [key, setKey] = useState(settings.key || '');
  const [model, setModel] = useState(settings.model || 'deepseek-chat');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleProviderChange = (e) => {
    const prov = e.target.value;
    setProvider(prov);
    if (prov === 'deepseek') {
      setUrl('https://api.deepseek.com');
      setModel('deepseek-chat');
    } else if (prov === 'ollama') {
      setUrl('http://localhost:11434/v1');
      setModel('llama3');
    } else if (prov === 'openai') {
      setUrl('https://api.openai.com/v1');
      setModel('gpt-4o-mini');
    }
  };

  const handleSave = () => {
    const newSettings = { provider, url, key, model };
    onSaveSettings(newSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="card" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="card-header">
        <div className="card-title">
          <Settings size={22} color="#10b981" />
          <span>Cấu Hình Nhà Cung Cấp LLM & Trí Tuệ Nhân Tạo</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={14} />
          <span>Nhà cung cấp (LLM Provider):</span>
        </label>
        <select value={provider} onChange={handleProviderChange} className="form-control">
          <option value="deepseek">⚡ DeepSeek API (Khuyên dùng — Giá rẻ & Tốc độ cao)</option>
          <option value="ollama">🦙 Ollama Local (Chạy cục bộ trên máy chủ VPS)</option>
          <option value="openai">🟢 OpenAI Official (GPT-4o / GPT-4o-mini)</option>
          <option value="custom">🌐 Tùy chỉnh Endpoint URL</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Globe size={14} />
          <span>API Endpoint Base URL:</span>
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="form-control"
          placeholder="https://api.deepseek.com"
        />
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Key size={14} />
          <span>API Secret Key / Token:</span>
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="form-control"
          placeholder="sk-..."
        />
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
          API Key được lưu bảo mật trong LocalStorage của trình duyệt này.
        </span>
      </div>

      <div className="form-group">
        <label className="form-label">Tên Model LLM:</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="form-control"
          placeholder="deepseek-chat"
        />
      </div>

      <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={handleSave}>
        {savedSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
        <span>{savedSuccess ? 'Đã Lưu Cấu Hình Thành Công!' : 'Lưu Cấu Hình'}</span>
      </button>
    </div>
  );
}
