import React, { useState, useEffect } from 'react';
import { History, Bot, Send, Trash2, RefreshCw, MessageSquare } from 'lucide-react';
import { fetchHistory, fetchSession, deleteSession, askLLMCopilot } from '../api';

export default function HistoryCopilotTab({ settings, onSelectSession }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await fetchHistory();
      setSessions(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSelectSession = async (id) => {
    try {
      const s = await fetchSession(id);
      setSelectedSession(s);
      setChatMessages([
        {
          role: 'system',
          text: `📄 Đã chọn phiên #${s.id}: "${s.title}". Bạn có thể đặt bất kỳ câu hỏi nào về nội dung này.`,
        },
      ]);
      if (onSelectSession) onSelectSession(s.text);
    } catch (e) {
      alert(`Lỗi nạp phiên: ${e.message}`);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc muốn xóa phiên này?')) return;
    try {
      await deleteSession(id);
      loadHistory();
      if (selectedSession?.id === id) {
        setSelectedSession(null);
        setChatMessages([]);
      }
    } catch (e) {
      alert(`Lỗi xóa: ${e.message}`);
    }
  };

  const handleAsk = async () => {
    const q = inputQuestion.trim();
    if (!q) return;

    const transcript = selectedSession?.text || '';
    if (!transcript) {
      alert('Vui lòng chọn một phiên có transcript từ danh sách bên trái!');
      return;
    }

    setChatMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInputQuestion('');
    setIsAsking(true);

    try {
      const res = await askLLMCopilot(transcript, q, settings);
      setChatMessages((prev) => [...prev, { role: 'assistant', text: res.answer }]);
    } catch (e) {
      setChatMessages((prev) => [...prev, { role: 'error', text: `❌ Lỗi: ${e.message}` }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="bento-grid">
      {/* Left Column: Sessions List */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <History size={20} color="#10b981" />
            <span>Lịch Sử Phiên Đã Lưu</span>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={loadHistory}>
            <RefreshCw size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
          {sessions.length > 0 ? (
            sessions.map((s) => {
              const isSelected = selectedSession?.id === s.id;
              return (
                <div
                  key={s.id}
                  className="card"
                  style={{
                    padding: '14px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                    borderColor: isSelected ? 'var(--accent-emerald)' : 'var(--border-subtle)',
                  }}
                  onClick={() => handleSelectSession(s.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--accent-emerald)' }}>
                      #{s.id} {s.title}
                    </span>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '2px 6px', color: 'var(--accent-rose)' }}
                      onClick={(e) => handleDelete(e, s.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    ⏱ {s.duration_s}s · {s.created_at} · Model: {s.model_label}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.text}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '10px' }}>
              Chưa có phiên nào được lưu trong cơ sở dữ liệu.
            </div>
          )}
        </div>
      </div>

      {/* Right Column: AI Copilot Chat */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Bot size={20} color="#06b6d4" />
            <span>Hỏi Đáp AI Copilot Về Nội Dung Phiên</span>
          </div>
        </div>

        <div className="transcript-box" style={{ minHeight: '320px', maxHeight: '380px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {chatMessages.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>
              Hãy chọn một phiên từ danh sách bên trái và đặt câu hỏi cho AI Copilot (ví dụ: "Tóm tắt các nhiệm vụ cần làm", "Trích xuất danh sách số liệu nhắc đến trong bài").
            </div>
          ) : (
            chatMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background:
                    msg.role === 'user'
                      ? 'rgba(16, 185, 129, 0.1)'
                      : msg.role === 'assistant'
                      ? 'rgba(255, 255, 255, 0.03)'
                      : 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: msg.role === 'user' ? 'var(--accent-emerald)' : 'var(--accent-cyan)', marginBottom: '4px' }}>
                  {msg.role === 'user' ? '👤 Bạn:' : msg.role === 'assistant' ? '🤖 PhoVoice AI:' : 'ℹ️ Hệ thống:'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.text}</div>
              </div>
            ))
          )}
          {isAsking && (
            <div style={{ color: 'var(--accent-emerald)', fontSize: '13px' }}>
              🤖 PhoVoice AI đang suy nghĩ câu trả lời...
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <input
            type="text"
            className="form-control"
            style={{ flex: 1 }}
            placeholder="Nhập câu hỏi về bài nói/bài giảng..."
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          />
          <button className="btn btn-primary" onClick={handleAsk} disabled={isAsking}>
            <Send size={16} />
            <span>Gửi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
