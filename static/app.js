/* ==========================================================================
   PhoVoice Studio Web — Client App Logic (Standalone Project)
   Responsive SPA, WebSocket Audio Streaming, REST API & Classroom AI
   ========================================================================== */

let currentSelectedFile = null;
let currentTranscriptText = "";
let currentSegments = [];
let selectedSessionTranscript = "";

// ─── Tab Switching ──────────────────────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');

  // Update Desktop Menu
  document.querySelectorAll('.desktop-menu .nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(tabId));
  });

  // Update Mobile Bottom Nav
  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(tabId));
  });

  if (tabId === 'tab-history') {
    loadHistory();
  }
}

// ─── File Upload & Transcribe ────────────────────────────────────────────────
function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  currentSelectedFile = file;

  document.getElementById('dropzone-filename').textContent = `📄 ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
  
  // Audio Preview
  const player = document.getElementById('audio-preview-player');
  player.src = URL.createObjectURL(file);
  player.style.display = 'block';
}

// Setup Drag & Drop
const dropzone = document.getElementById('file-dropzone');
if (dropzone) {
  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected({ target: { files: e.dataTransfer.files } });
    }
  });
}

async function startTranscribing() {
  if (!currentSelectedFile) {
    alert("Vui lòng chọn hoặc kéo thả một file âm thanh trước!");
    return;
  }

  const btn = document.getElementById('btn-start-transcribe');
  const progress = document.getElementById('transcribe-progress-bar');
  const output = document.getElementById('transcript-output');

  btn.disabled = true;
  btn.textContent = "⏳ Đang chuyển đổi...";
  progress.style.display = 'block';
  output.textContent = "Đang nạp model và nhận dạng tiếng Việt...";

  const formData = new FormData();
  formData.append("file", currentSelectedFile);
  formData.append("model", document.getElementById('asr-model-select').value);
  formData.append("punctuate", document.getElementById('chk-punctuate').checked);

  try {
    const res = await fetch("/api/transcribe", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Lỗi xử lý");
    }

    const data = await res.json();
    currentTranscriptText = data.text;
    currentSegments = data.segments || [];

    if (currentSegments.length > 0) {
      let html = "";
      currentSegments.forEach(seg => {
        const m = Math.floor(seg.start_s / 60);
        const s = (seg.start_s % 60).toFixed(1).padStart(4, '0');
        html += `<div class="segment-item">
          <span class="segment-time">⏱ [${m.toString().padStart(2, '0')}:${s}]</span>
          <span>${seg.text}</span>
        </div>`;
      });
      output.innerHTML = html;
    } else {
      output.textContent = data.text || "(Không có nội dung nhận dạng)";
    }

    document.getElementById('transcribe-stat-time').textContent = `⏱ Thời lượng: ${data.duration_s}s · Xử lý: ${data.processing_time_s}s`;
    document.getElementById('transcribe-stat-rtf').textContent = `Tốc độ RTF: ${data.rtf}x`;

  } catch (err) {
    output.textContent = `❌ Lỗi chuyển đổi: ${err.message}`;
    alert(`Lỗi: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "🚀 BẮT ĐẦU CHUYỂN ĐỔI";
    progress.style.display = 'none';
  }
}

// Copy & Export
function copyTranscript() {
  if (!currentTranscriptText) {
    alert("Chưa có nội dung để sao chép!");
    return;
  }
  navigator.clipboard.writeText(currentTranscriptText);
  alert("Đã sao chép nội dung vào Clipboard ✅");
}

function exportFile(format) {
  if (!currentTranscriptText) {
    alert("Chưa có dữ liệu để xuất file!");
    return;
  }

  let content = currentTranscriptText;
  let filename = `transcript_${Date.now()}.${format}`;
  let mime = "text/plain";

  if (format === 'srt' && currentSegments.length > 0) {
    content = "";
    currentSegments.forEach((seg, idx) => {
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
    content = `# Transcript AI\n\n${currentTranscriptText}`;
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}


// ─── WebSocket Live Microphone Streaming ─────────────────────────────────────
let audioContext = null;
let micMediaStream = null;
let scriptProcessor = null;
let liveWebSocket = null;
let isLiveRecording = false;
let liveTimerInterval = null;
let liveStartTime = 0;

async function toggleLiveRecording() {
  const btn = document.getElementById('btn-live-record');
  const hint = document.getElementById('live-status-hint');
  const vuFill = document.getElementById('live-vu-fill');
  const liveBox = document.getElementById('live-transcript-box');

  if (isLiveRecording) {
    // Stop recording
    isLiveRecording = false;
    btn.classList.remove('recording');
    hint.textContent = "Đã dừng thu âm.";
    vuFill.style.width = '0%';
    clearInterval(liveTimerInterval);

    if (scriptProcessor) scriptProcessor.disconnect();
    if (micMediaStream) micMediaStream.getTracks().forEach(t => t.stop());
    if (audioContext) audioContext.close();
    if (liveWebSocket) liveWebSocket.close();

    // Tự động khôi phục dấu câu ViBERT Capu khi dừng nói
    if (currentTranscriptText) {
      hint.textContent = "✨ Đang tự động thêm dấu câu và viết hoa chuẩn ngữ pháp...";
      try {
        const res = await fetch("/api/punctuate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: currentTranscriptText })
        });
        const d = await res.json();
        if (d.text) {
          liveBox.textContent = d.text;
          currentTranscriptText = d.text;
        }
      } catch (e) {}
      hint.textContent = "✅ Đã dừng thu âm và hoàn thành thêm dấu câu.";
    }
    return;
  }

  try {
    micMediaStream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    
    const source = audioContext.createMediaStreamSource(micMediaStream);
    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    liveWebSocket = new WebSocket(`${protocol}//${location.host}/api/ws/stream`);

    liveWebSocket.onopen = () => {
      isLiveRecording = true;
      btn.classList.add('recording');
      hint.textContent = "🔴 Đang lắng nghe giọng nói của bạn…";
      liveBox.textContent = "";
      liveStartTime = Date.now();
      liveTimerInterval = setInterval(updateLiveTimer, 100);
    };

    liveWebSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.full_text) {
        liveBox.textContent = data.full_text;
        currentTranscriptText = data.full_text;
      }
    };

    scriptProcessor.onaudioprocess = (e) => {
      if (!isLiveRecording || liveWebSocket.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      
      let maxVal = 0;
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        if (Math.abs(s) > maxVal) maxVal = Math.abs(s);
      }
      vuFill.style.width = `${Math.min(100, Math.round(maxVal * 100))}%`;

      liveWebSocket.send(pcm16.buffer);
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

  } catch (err) {
    alert(`Không thể truy cập micro: ${err.message}`);
  }
}

function updateLiveTimer() {
  const elapsed = Math.floor((Date.now() - liveStartTime) / 100);
  const m = Math.floor(elapsed / 600);
  const s = Math.floor((elapsed % 600) / 10);
  const ds = elapsed % 10;
  document.getElementById('live-timer-display').textContent = 
    `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ds}`;
}


// ─── Classroom AI Analysis ──────────────────────────────────────────────────
async function generateClassroomAI() {
  if (!currentTranscriptText) {
    alert("Chưa có nội dung transcript để phân tích! Vui lòng chuyển đổi hoặc thu âm trước.");
    return;
  }

  const summaryBox = document.getElementById('cr-summary-content');
  const outlineBox = document.getElementById('cr-outline-content');
  const flashcardBox = document.getElementById('cr-flashcard-content');
  const quizBox = document.getElementById('cr-quiz-content');

  summaryBox.textContent = "🤖 Đang phân tích bài giảng và tóm tắt...";
  outlineBox.textContent = "🤖 Đang lập dàn ý cấu trúc...";
  flashcardBox.textContent = "🤖 Đang trích xuất thuật ngữ...";
  quizBox.textContent = "🤖 Đang sinh câu hỏi ôn tập...";

  const settings = getSavedSettings();

  try {
    const res = await fetch("/api/llm/classroom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: currentTranscriptText,
        api_url: settings.url,
        api_key: settings.key,
        model: settings.model
      })
    });

    const data = await res.json();
    summaryBox.textContent = data.summary || "Hoàn tất";
    outlineBox.textContent = data.outline || "Hoàn tất";

    if (data.flashcards && data.flashcards.length > 0) {
      flashcardBox.textContent = data.flashcards.map(c => `• ${c.term}: ${c.definition}`).join('\n\n');
    } else {
      flashcardBox.textContent = "Không tìm thấy thuật ngữ chuyên ngành nổi bật.";
    }

    if (data.quizzes && data.quizzes.length > 0) {
      quizBox.textContent = data.quizzes.map((q, i) => 
        `Câu ${i+1}: ${q.question}\n${q.options.join('\n')}\n-> Đáp án: ${q.answer} (${q.explanation})`
      ).join('\n\n');
    } else {
      quizBox.textContent = "Hoàn tất phân tích.";
    }

  } catch (err) {
    alert(`Lỗi phân tích LLM: ${err.message}`);
  }
}


// ─── History & Copilot ───────────────────────────────────────────────────────
async function loadHistory() {
  const box = document.getElementById('history-list-box');
  box.innerHTML = "Đang tải...";

  try {
    const res = await fetch("/api/history");
    const items = await res.json();

    if (items.length === 0) {
      box.innerHTML = "<div style='color:var(--text-muted); padding:10px;'>Chưa có phiên nào được lưu.</div>";
      return;
    }

    let html = "";
    items.forEach(it => {
      html += `
        <div class="card" style="padding:12px; cursor:pointer; background:var(--bg-surface-elevated);" onclick="selectHistoryItem(${it.id})">
          <div style="font-weight:600; font-size:13px; color:var(--accent-emerald);">#${it.id} ${it.title}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">⏱ ${it.duration_s}s · ${it.created_at}</div>
          <div style="font-size:12px; color:var(--text-secondary); margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${it.text}</div>
        </div>
      `;
    });
    box.innerHTML = html;
  } catch (e) {
    box.innerHTML = `<div style='color:var(--accent-rose);'>Lỗi nạp lịch sử: ${e.message}</div>`;
  }
}

async function selectHistoryItem(id) {
  try {
    const res = await fetch(`/api/history/${id}`);
    const data = await res.json();
    selectedSessionTranscript = data.text;
    currentTranscriptText = data.text;
    document.getElementById('copilot-chat-history').innerHTML = `
      <div style="color:var(--accent-cyan); font-weight:600; margin-bottom:8px;">📄 Đã chọn phiên #${data.id}: "${data.title}"</div>
      <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px; max-height:100px; overflow-y:auto;">${data.text}</div>
      <div style="border-top:1px solid var(--border-subtle); padding-top:8px; color:var(--accent-emerald);">Bạn có thể đặt câu hỏi về phiên này bên dưới:</div>
    `;
  } catch (e) {
    alert(`Lỗi nạp phiên: ${e.message}`);
  }
}

async function askCopilot() {
  const input = document.getElementById('copilot-question-input');
  const q = input.value.trim();
  if (!q) return;

  const chat = document.getElementById('copilot-chat-history');
  chat.innerHTML += `<div style="margin-top:8px; font-weight:600; color:#fff;">👤 Bạn: ${q}</div>`;
  chat.innerHTML += `<div id="copilot-loading" style="color:var(--accent-emerald); font-size:12px; margin-top:4px;">🤖 AI đang suy nghĩ...</div>`;
  input.value = "";

  const settings = getSavedSettings();

  try {
    const res = await fetch("/api/llm/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: selectedSessionTranscript || currentTranscriptText,
        question: q,
        api_url: settings.url,
        api_key: settings.key,
        model: settings.model
      })
    });

    const data = await res.json();
    const loading = document.getElementById('copilot-loading');
    if (loading) loading.remove();
    chat.innerHTML += `<div style="margin-top:6px; padding:10px; background:rgba(255,255,255,0.03); border-radius:6px; line-height:1.6;">🤖 <b>PhoVoice AI:</b>\n${data.answer}</div>`;
    chat.scrollTop = chat.scrollHeight;
  } catch (e) {
    chat.innerHTML += `<div style="color:var(--accent-rose);">❌ Lỗi: ${e.message}</div>`;
  }
}


// ─── Settings Storage ────────────────────────────────────────────────────────
function handleProviderChange() {
  const prov = document.getElementById('setting-llm-provider').value;
  const url = document.getElementById('setting-llm-url');
  const model = document.getElementById('setting-llm-model');

  if (prov === 'deepseek') {
    url.value = 'https://api.deepseek.com';
    model.value = 'deepseek-chat';
  } else if (prov === 'ollama') {
    url.value = 'http://localhost:11434/v1';
    model.value = 'llama3';
  } else if (prov === 'openai') {
    url.value = 'https://api.openai.com/v1';
    model.value = 'gpt-4o-mini';
  }
}

function saveSettings() {
  const settings = {
    provider: document.getElementById('setting-llm-provider').value,
    url: document.getElementById('setting-llm-url').value,
    key: document.getElementById('setting-llm-key').value,
    model: document.getElementById('setting-llm-model').value,
  };
  localStorage.setItem('phovoice_web_settings', JSON.stringify(settings));
  alert("Đã lưu cấu hình LLM thành công ✅");
}

function getSavedSettings() {
  const saved = localStorage.getItem('phovoice_web_settings');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return { url: 'https://api.deepseek.com', key: '', model: 'deepseek-chat' };
}

window.addEventListener('DOMContentLoaded', () => {
  const s = getSavedSettings();
  if (s.provider) document.getElementById('setting-llm-provider').value = s.provider;
  if (s.url) document.getElementById('setting-llm-url').value = s.url;
  if (s.key) document.getElementById('setting-llm-key').value = s.key;
  if (s.model) document.getElementById('setting-llm-model').value = s.model;
});
