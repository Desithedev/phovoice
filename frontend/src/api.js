/**
 * PhoVoice API Client — REST & WebSocket helper functions.
 */

export async function fetchHealth() {
  const res = await fetch('/api/health');
  return res.json();
}

export async function fetchModels() {
  const res = await fetch('/api/models');
  return res.json();
}

export async function transcribeAudioFile(file, model = '68M', punctuate = true) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', model);
  formData.append('punctuate', punctuate);

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Lỗi khi chuyển đổi');
  }
  return res.json();
}

export async function punctuateText(text) {
  const res = await fetch('/api/punctuate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return res.json();
}

export async function generateClassroomAI(transcript, settings) {
  const res = await fetch('/api/llm/classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      api_url: settings.url,
      api_key: settings.key,
      model: settings.model,
    }),
  });
  if (!res.ok) throw new Error('Lỗi phân tích LLM');
  return res.json();
}

export async function askLLMCopilot(transcript, question, settings) {
  const res = await fetch('/api/llm/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      question,
      api_url: settings.url,
      api_key: settings.key,
      model: settings.model,
    }),
  });
  if (!res.ok) throw new Error('Lỗi gọi Copilot');
  return res.json();
}

export async function fetchHistory() {
  const res = await fetch('/api/history');
  return res.json();
}

export async function fetchSession(id) {
  const res = await fetch(`/api/history/${id}`);
  return res.json();
}

export async function deleteSession(id) {
  const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
  return res.json();
}
