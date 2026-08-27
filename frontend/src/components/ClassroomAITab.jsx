import React, { useState } from 'react';
import { GraduationCap, Sparkles, BookOpen, ListTree, Layers, HelpCircle, Check, X } from 'lucide-react';
import { generateClassroomAI } from '../api';

export default function ClassroomAITab({ currentTranscript, settings }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [data, setData] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const handleAnalyze = async () => {
    if (!currentTranscript) {
      alert('Chưa có nội dung transcript! Vui lòng chuyển đổi file hoặc thu âm trước.');
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await generateClassroomAI(currentTranscript, settings);
      setData(res);
    } catch (err) {
      alert(`Lỗi phân tích LLM: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleFlip = (index) => {
    setFlippedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const selectOption = (qIdx, opt) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: opt }));
  };

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="card-title">
          <GraduationCap size={22} color="#8b5cf6" />
          <span>Giảng Đường AI — Trợ Lý Bài Giảng & Phân Tích Thông Minh</span>
        </div>

        <button
          className="btn btn-primary"
          disabled={isAnalyzing}
          onClick={handleAnalyze}
        >
          <Sparkles size={16} />
          <span>{isAnalyzing ? '🤖 Đang phân tích...' : '✨ Phân Tích Bài Giảng Bằng AI'}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Quadrant 1: Summary */}
        <div className="card" style={{ background: 'var(--bg-surface-elevated)', padding: '20px' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} />
            <span>Tóm Tắt Ý Chính</span>
          </div>
          <div style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxHeight: '280px', overflowY: 'auto' }}>
            {data?.summary || '(Chưa có bản tóm tắt)'}
          </div>
        </div>

        {/* Quadrant 2: Outline */}
        <div className="card" style={{ background: 'var(--bg-surface-elevated)', padding: '20px' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListTree size={18} />
            <span>Dàn Ý Cấu Trúc</span>
          </div>
          <div style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxHeight: '280px', overflowY: 'auto' }}>
            {data?.outline || '(Chưa có dàn ý bài giảng)'}
          </div>
        </div>

        {/* Quadrant 3: 3D Flashcards */}
        <div className="card" style={{ background: 'var(--bg-surface-elevated)', padding: '20px' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} />
            <span>Flashcards Thuật Ngữ (Chạm để lật)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
            {data?.flashcards?.length > 0 ? (
              data.flashcards.map((fc, i) => (
                <div
                  key={i}
                  className={`flashcard-wrapper ${flippedCards[i] ? 'flipped' : ''}`}
                  onClick={() => toggleFlip(i)}
                  style={{ height: '110px' }}
                >
                  <div className="flashcard-inner">
                    <div className="flashcard-front">
                      <div style={{ fontWeight: 700, color: 'var(--accent-amber)', fontSize: '14px' }}>💡 {fc.term}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Chạm để xem định nghĩa 🔄</div>
                    </div>
                    <div className="flashcard-back">
                      <div>{fc.definition}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>(Chưa có flashcards)</div>
            )}
          </div>
        </div>

        {/* Quadrant 4: Interactive Quiz */}
        <div className="card" style={{ background: 'var(--bg-surface-elevated)', padding: '20px' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={18} />
            <span>Bộ Câu Hỏi Trắc Nghiệm</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '280px', overflowY: 'auto' }}>
            {data?.quizzes?.length > 0 ? (
              data.quizzes.map((q, qIdx) => {
                const userChoice = selectedAnswers[qIdx];
                return (
                  <div key={qIdx} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                      Câu {qIdx + 1}: {q.question}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {q.options?.map((opt, oIdx) => {
                        const isSelected = userChoice === opt;
                        const isCorrect = q.answer && opt.toLowerCase().includes(q.answer.toLowerCase());
                        let btnStyle = { textAlign: 'left', padding: '6px 10px', fontSize: '12px' };
                        
                        return (
                          <button
                            key={oIdx}
                            className={`btn ${isSelected ? (isCorrect ? 'btn-primary' : 'btn-danger') : 'btn-ghost'}`}
                            style={btnStyle}
                            onClick={() => selectOption(qIdx, opt)}
                          >
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                    {userChoice && (
                      <div style={{ fontSize: '12px', color: 'var(--accent-emerald)', marginTop: '6px' }}>
                        💡 <b>Đáp án:</b> {q.answer} — <i>{q.explanation}</i>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>(Chưa có câu hỏi trắc nghiệm)</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
