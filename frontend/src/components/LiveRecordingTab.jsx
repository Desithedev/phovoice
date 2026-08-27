import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Copy, CheckCircle2, Sparkles, Volume2 } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';
import { punctuateText } from '../api';

export default function LiveRecordingTab({ onTranscriptReady }) {
  const [isRecording, setIsRecording] = useState(false);
  const [timerText, setTimerText] = useState('00:00.0');
  const [statusHint, setStatusHint] = useState('Chạm vào Micro để bắt đầu thu âm và nhận dạng trực tiếp');
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const websocketRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(0);

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setStatusHint('✨ Đang hoàn thiện dấu câu và viết hoa...');
      setAudioLevel(0);
      clearInterval(timerIntervalRef.current);

      if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      if (websocketRef.current) websocketRef.current.close();

      if (transcript.trim()) {
        try {
          const d = await punctuateText(transcript);
          if (d.text) {
            setTranscript(d.text);
            if (onTranscriptReady) onTranscriptReady(d.text);
          }
        } catch (e) {}
      }
      setStatusHint('✅ Đã dừng thu âm và hoàn thành văn bản.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1 },
      });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/stream`);
      websocketRef.current = ws;

      ws.onopen = () => {
        setIsRecording(true);
        setStatusHint('🔴 Đang lắng nghe giọng nói của bạn…');
        setTranscript('');
        startTimeRef.current = Date.now();
        timerIntervalRef.current = setInterval(updateTimer, 100);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.full_text) {
          setTranscript(data.full_text);
        }
      };

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);

        let maxVal = 0;
        const pcm16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          if (Math.abs(s) > maxVal) maxVal = Math.abs(s);
        }
        setAudioLevel(Math.min(100, Math.round(maxVal * 120)));

        ws.send(pcm16.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (err) {
      alert(`Không thể mở micro: ${err.message}`);
    }
  };

  const updateTimer = () => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 100);
    const m = Math.floor(elapsed / 600);
    const s = Math.floor((elapsed % 600) / 10);
    const ds = elapsed % 10;
    setTimerText(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ds}`);
  };

  const handleCopy = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="card" style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div className="card-header" style={{ justifyContent: 'center' }}>
        <div className="card-title">
          <Volume2 size={22} color="#10b981" />
          <span>Thu Âm Trực Tiếp Qua Micro (Real-Time ASR)</span>
        </div>
      </div>

      <div className="live-mic-container">
        <div className="timer-lcd-display">{timerText}</div>

        <button
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
        >
          {isRecording ? <MicOff size={44} /> : <Mic size={44} />}
        </button>

        <WaveformVisualizer isRecording={isRecording} level={audioLevel} />

        <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          {statusHint}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
            📝 Nhận Dạng Thời Gian Thực:
          </span>
          {transcript && (
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={handleCopy}>
              {copySuccess ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copySuccess ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          )}
        </div>

        <div className="transcript-box" style={{ minHeight: '180px' }}>
          {transcript ? (
            <span>{transcript}</span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>
              (Đang chờ âm thanh… Văn bản sẽ hiển thị theo thời gian thực khi bạn nói)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
