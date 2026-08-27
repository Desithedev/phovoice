import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, FileAudio, Play, CheckCircle2, Copy, FileText, Download,
  Sparkles, Activity, Clock, Cpu, Check, AlertCircle, Edit3, List,
  Search, Replace, RotateCcw, Volume2, Save
} from 'lucide-react';
import { transcribeAudioFile } from '../api';

export default function FileTranscribeTab({ onTranscriptReady }) {
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [model, setModel] = useState('68M');
  const [punctuate, setPunctuate] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStage, setCurrentStage] = useState(1);
  const [elapsedTime, setElapsedTime] = useState('00:00.0');
  const [result, setResult] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [viewMode, setViewMode] = useState('segments'); // 'segments' | 'full'
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const audioPlayerRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const progressIntervalRef = useRef(null);

  const stages = [
    { id: 1, name: 'Chuẩn hóa định dạng âm thanh (16kHz Mono)', icon: '🎵' },
    { id: 2, name: 'Phát hiện giọng nói & Cắt đoạn Silero VAD', icon: '🧠' },
    { id: 3, name: 'Giải mã tiếng Việt Zipformer Multi-Core', icon: '⚡' },
    { id: 4, name: 'Phục hồi dấu câu & Viết hoa ViBERT-Capu', icon: '✨' },
  ];

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setAudioUrl(URL.createObjectURL(f));
      setResult(null);
      setProgressPercent(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setAudioUrl(URL.createObjectURL(f));
      setResult(null);
      setProgressPercent(0);
    }
  };

  const handleTranscribe = async () => {
    if (!file) {
      alert('Vui lòng chọn hoặc kéo thả file âm thanh trước!');
      return;
    }

    setIsProcessing(true);
    setProgressPercent(5);
    setCurrentStage(1);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - startTimeRef.current) / 100);
      const m = Math.floor(diff / 600);
      const s = Math.floor((diff % 600) / 10);
      const ds = diff % 10;
      setElapsedTime(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ds}`);
    }, 100);

    progressIntervalRef.current = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev < 25) {
          setCurrentStage(1);
          return prev + 3;
        } else if (prev < 55) {
          setCurrentStage(2);
          return prev + 2;
        } else if (prev < 85) {
          setCurrentStage(3);
          return prev + 1.5;
        } else if (prev < 95) {
          setCurrentStage(4);
          return prev + 0.5;
        }
        return prev;
      });
    }, 200);

    try {
      const data = await transcribeAudioFile(file, model, punctuate);
      setProgressPercent(100);
      setCurrentStage(4);
      setResult(data);
      if (onTranscriptReady) onTranscriptReady(data.text);
    } catch (err) {
      alert(`Lỗi chuyển đổi: ${err.message}`);
    } finally {
      clearInterval(timerRef.current);
      clearInterval(progressIntervalRef.current);
      setIsProcessing(false);
    }
  };

  // ─── Inline Segment & Full Text Editing Handlers ─────────────────────────────
  const handleSegmentChange = (index, newText) => {
    if (!result) return;
    const newSegments = [...result.segments];
    newSegments[index] = { ...newSegments[index], text: newText };
    const updatedFullText = newSegments.map((s) => s.text).join(' ');
    
    setResult((prev) => ({
      ...prev,
      text: updatedFullText,
      segments: newSegments,
    }));
    if (onTranscriptReady) onTranscriptReady(updatedFullText);
  };

  const handleFullTextChange = (e) => {
    const updatedText = e.target.value;
    setResult((prev) => ({
      ...prev,
      text: updatedText,
    }));
    if (onTranscriptReady) onTranscriptReady(updatedText);
  };

  const handleSeekAudio = (sec) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = Math.max(0, sec - 0.2);
      audioPlayerRef.current.play();
    }
  };

  const handleFindAndReplace = () => {
    if (!findText || !result?.text) return;
    const regex = new RegExp(findText, 'gi');
    const newFullText = result.text.replace(regex, replaceText);
    
    const newSegments = result.segments?.map((seg) => ({
      ...seg,
      text: seg.text.replace(regex, replaceText),
    })) || [];

    setResult((prev) => ({
      ...prev,
      text: newFullText,
      segments: newSegments,
    }));
    if (onTranscriptReady) onTranscriptReady(newFullText);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCapitalizeSentences = () => {
    if (!result?.text) return;
    const cap = (str) => str.replace(/(^\s*|[.!?]\s+)([a-zà-ỹ])/g, (m, p1, p2) => p1 + p2.toUpperCase());
    
    const newFullText = cap(result.text);
    const newSegments = result.segments?.map((s) => ({ ...s, text: cap(s.text) })) || [];

    setResult((prev) => ({
      ...prev,
      text: newFullText,
      segments: newSegments,
    }));
    if (onTranscriptReady) onTranscriptReady(newFullText);
  };

  const handleCopy = () => {
    if (!result?.text) return;
    navigator.clipboard.writeText(result.text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleExport = (format) => {
    if (!result?.text) return;
    let content = result.text;
    let filename = `transcript_${Date.now()}.${format}`;
    let mime = 'text/plain';

    if (format === 'srt' && result.segments?.length > 0) {
      content = '';
      result.segments.forEach((seg, idx) => {
        const tc = (sec) => {
          const h = Math.floor(sec / 3600);
          const m = Math.floor((sec % 3600) / 60);
          const s = Math.floor(sec % 60);
          const ms = Math.floor((sec % 1) * 1000);
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
        };
        content += `${idx + 1}\n${tc(seg.start_s)} --> ${tc(seg.end_s)}\n${seg.text}\n\n`;
      });
    } else if (format === 'md') {
      content = `# Bản Ghi Âm Tiếng Việt (PhoVoice AI)\n\n**File:** ${result.filename || 'Audio'}\n**Thời lượng:** ${result.duration_s}s\n\n---\n\n${result.text}`;
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="bento-grid">
      {/* Left Deck: File Input & Configuration */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileAudio size={20} color="#10b981" />
            <span>Nguồn Âm Thanh & Cấu Hình</span>
          </div>
        </div>

        <div
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload-input').click()}
        >
          <div className="dropzone-icon-circle">
            <UploadCloud size={28} />
          </div>
          <div style={{ fontWeight: 600, fontSize: '14.5px' }}>
            {file ? `📄 ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)` : 'Chạm để chọn file hoặc kéo thả vào đây'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Hỗ trợ WAV, MP3, M4A, FLAC, OGG (Tối đa 500MB)
          </div>
          <input
            id="file-upload-input"
            type="file"
            accept="audio/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {audioUrl && (
          <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Volume2 size={13} color="var(--accent-emerald)" />
              <span>Trình phát nghe lại âm thanh gốc:</span>
            </div>
            <audio ref={audioPlayerRef} controls src={audioUrl} style={{ width: '100%', height: '36px', borderRadius: '8px' }} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Mô hình AI nhận dạng:</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="form-control">
            <option value="68M">⚖️ BALANCED — Zipformer 68M (Chuẩn mực, Đầy đủ)</option>
            <option value="30M">⚡ FAST — Zipformer 30M (Siêu nhanh)</option>
            <option value="VI-EN">🌐 VI-EN — NghiASR INT8 (Thuật ngữ CNTT)</option>
            <option value="MULTILINGUAL">🌍 MULTILINGUAL — PengCheng Starling</option>
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={punctuate}
            onChange={(e) => setPunctuate(e.target.checked)}
            style={{ accentColor: 'var(--accent-emerald)', width: '16px', height: '16px' }}
          />
          <span>Phục hồi dấu câu & viết hoa tự động (ViBERT Capu)</span>
        </label>

        <button
          className="btn btn-primary btn-large"
          disabled={isProcessing}
          onClick={handleTranscribe}
        >
          <Sparkles size={18} />
          <span>{isProcessing ? '⏳ ĐANG NHẬN DẠNG...' : '🚀 BẮT ĐẦU CHUYỂN ĐỔI'}</span>
        </button>
      </div>

      {/* Right Deck: Visual Progress Dashboard & Interactive Transcript Editor */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <div className="card-title">
            <FileText size={20} color="#06b6d4" />
            <span>Bản Ghi Âm Thanh (Chỉnh sửa trực tiếp ✍️)</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {/* View Mode Switcher */}
            {result && (
              <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
                <button
                  className={`btn ${viewMode === 'segments' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                  onClick={() => setViewMode('segments')}
                >
                  <List size={13} />
                  <span>Từng đoạn</span>
                </button>
                <button
                  className={`btn ${viewMode === 'full' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                  onClick={() => setViewMode('full')}
                >
                  <Edit3 size={13} />
                  <span>Toàn bài</span>
                </button>
              </div>
            )}

            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleCopy} disabled={!result}>
              {copySuccess ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copySuccess ? 'Đã chép' : 'Sao chép'}</span>
            </button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => handleExport('txt')} disabled={!result}>TXT</button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => handleExport('srt')} disabled={!result}>SRT</button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => handleExport('md')} disabled={!result}>MD</button>
          </div>
        </div>

        {/* ═══ EDITING TOOLBAR ═══ */}
        {result && !isProcessing && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-surface-elevated)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className={`btn ${showFindReplace ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '11.5px' }}
                onClick={() => setShowFindReplace(!showFindReplace)}
              >
                <Search size={12} />
                <span>Tìm & Thay thế</span>
              </button>

              <button
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: '11.5px' }}
                onClick={handleCapitalizeSentences}
              >
                <Sparkles size={12} />
                <span>Viết hoa đầu câu</span>
              </button>
            </div>

            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              ✍️ <i>Bấm trực tiếp vào chữ để sửa</i>
            </div>
          </div>
        )}

        {/* Find & Replace Bar */}
        {showFindReplace && result && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--accent-emerald)' }}>
            <input
              type="text"
              className="form-control"
              style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
              placeholder="Từ cần tìm..."
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
            />
            <input
              type="text"
              className="form-control"
              style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
              placeholder="Thay thế bằng..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
            />
            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleFindAndReplace}>
              {saveSuccess ? <Check size={14} /> : <Replace size={14} />}
              <span>Thay thế</span>
            </button>
          </div>
        )}

        {/* ═══ VISUAL PROCESSING PROGRESS DASHBOARD ═══ */}
        {isProcessing && (
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-active)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-emerald)', animation: 'pulseNeon 1.5s infinite' }} />
                <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
                  Đang xử lý: {Math.round(progressPercent)}%
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                <Clock size={16} />
                <span>Thời gian: {elapsedTime}</span>
              </div>
            </div>

            <div style={{ width: '100%', height: '8px', background: 'var(--bg-input)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6)',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.6)',
                transition: 'width 0.25s ease-out'
              }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              {stages.map((stg) => {
                const isDone = progressPercent >= (stg.id * 25);
                const isCurrent = currentStage === stg.id && !isDone;
                return (
                  <div
                    key={stg.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: isCurrent ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isCurrent ? 'var(--accent-emerald)' : 'transparent'}`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <span>{stg.icon}</span>
                      <span style={{ fontWeight: isCurrent ? 600 : 400, color: isDone ? 'var(--text-primary)' : isCurrent ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                        {stg.name}
                      </span>
                    </div>

                    <div>
                      {isDone && <Check size={16} color="#10b981" />}
                      {isCurrent && <span style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: 600, animation: 'pulse 1s infinite' }}>Đang chạy...</span>}
                      {!isDone && !isCurrent && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chờ</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ INTERACTIVE EDITABLE TRANSCRIPT ═══ */}
        {!isProcessing && (
          <div className="transcript-box" style={{ minHeight: '320px' }}>
            {/* Mode 1: Segments List (Editable & Click-to-Play Audio) */}
            {viewMode === 'segments' && result?.segments?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.segments.map((seg, i) => {
                  const m = Math.floor(seg.start_s / 60);
                  const s = (seg.start_s % 60).toFixed(1).padStart(4, '0');
                  return (
                    <div key={i} className="segment-row" style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.1)' }}
                          onClick={() => handleSeekAudio(seg.start_s)}
                          title="Bấm để phát âm thanh từ giây này"
                        >
                          <Play size={10} style={{ fill: 'currentColor' }} />
                          <span>[{m.toString().padStart(2, '0')}:{s}]</span>
                        </button>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{i + 1}</span>
                      </div>

                      {/* Directly Editable Segment Text Input */}
                      <textarea
                        value={seg.text}
                        onChange={(e) => handleSegmentChange(i, e.target.value)}
                        rows={Math.max(1, Math.ceil(seg.text.length / 75))}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: '1px solid transparent',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          lineHeight: '1.6',
                          resize: 'none',
                          padding: '4px 6px',
                          outline: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--accent-emerald)';
                          e.target.style.background = 'var(--bg-input)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'transparent';
                          e.target.style.background = 'transparent';
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mode 2: Full Text Area Editor */}
            {viewMode === 'full' && result?.text && (
              <textarea
                value={result.text}
                onChange={handleFullTextChange}
                style={{
                  width: '100%',
                  minHeight: '300px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '14.5px',
                  lineHeight: '1.7',
                  resize: 'vertical',
                  outline: 'none',
                }}
                placeholder="Nội dung bản ghi..."
              />
            )}

            {!result && (
              <div style={{ color: 'var(--text-muted)' }}>
                Chưa có dữ liệu. Vui lòng chọn file âm thanh và bấm "Bắt đầu chuyển đổi".
              </div>
            )}
          </div>
        )}

        {result && !isProcessing && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', paddingTop: '4px' }}>
            <span>⏱ Thời lượng audio: <b>{result.duration_s}s</b> · Xử lý xong sau: <b>{result.processing_time_s}s</b></span>
            <span>Tốc độ RTF: <b style={{ color: 'var(--accent-emerald)' }}>{result.rtf}x</b></span>
          </div>
        )}
      </div>
    </div>
  );
}
