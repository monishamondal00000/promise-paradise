import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, useAuth } from '../context/AuthContext';
import { FiCpu, FiRefreshCw, FiTrash2, FiSend, FiMessageCircle, FiZap } from 'react-icons/fi';
import { MarkdownMessage } from '../utils/markdownRenderer';
import AgentChat from '../components/AgentChat';
import ConfirmPopup from '../components/ConfirmPopup';

const ASK_WELCOME = {
  role: 'assistant',
  content:
    "Hi! I'm your Wedding Assistant. Ask me about destinations, packages, vendors, or pricing. Switch to **Plan with AI Agent** for a full guided booking experience."
};

const STORAGE_KEY = 'pp_chat_v1';

function loadLocal(mode) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.[mode] || null;
  } catch { return null; }
}
function saveLocal(mode, messages) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[mode] = messages.slice(-20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}
function clearLocal(mode) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    delete all[mode];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState('ask');

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pt-20 pb-4 flex flex-col bg-gradient-to-b from-ivory to-white">
        {/* Header */}
        <div className="px-4 py-5 text-center border-b border-blush/30">
          <div className="max-w-3xl mx-auto">
            <div className="w-12 h-12 bg-gradient-to-br from-gold to-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg">
              <FiCpu className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-dark tracking-tight">Wedding Assistant</h1>
            <p className="text-gray-500 text-sm mt-1">Ask questions or plan with an AI agent — your choice</p>

            <div className="mt-4 inline-flex items-center bg-white border border-gray-200 rounded-full p-1 shadow-sm">
              <button
                onClick={() => setMode('ask')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'ask' ? 'bg-gold text-white shadow' : 'text-gray-600 hover:text-gold'
                }`}
              >
                <FiMessageCircle className="w-4 h-4" /> Ask
              </button>
              <button
                onClick={() => setMode('agent')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'agent' ? 'bg-gold text-white shadow' : 'text-gray-600 hover:text-gold'
                }`}
              >
                <FiZap className="w-4 h-4" /> Plan with AI Agent
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {mode === 'ask'
                ? 'Get info, comparisons, and inline links to packages & destinations.'
                : 'I guide you step by step to a ready-to-pay booking.'}
            </p>
          </div>
        </div>

        {mode === 'ask'
          ? <AskChat user={user} navigate={navigate} />
          : <AgentChat />
        }
      </div>

      <footer className="bg-dark text-white py-8 px-4 text-center">
        <p className="font-serif text-gold text-lg">Promise Paradise</p>
        <p className="text-gray-400 text-xs mt-1">promiseparadisesupport@gmail.com · Kolkata, India</p>
        <p className="text-gray-500 text-xs mt-1">© 2026 Promise Paradise. All rights reserved.</p>
      </footer>
    </div>
  );
}

function AskChat({ user, navigate }) {
  const [messages, setMessages] = useState([ASK_WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [regenIdx, setRegenIdx] = useState(null);
  const [showClearPopup, setShowClearPopup] = useState(false);
  const messagesEndRef = useRef(null);
  const initialized = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let history = null;
      if (user) {
        try {
          const res = await API.get('/ai/chats?mode=ask');
          if (Array.isArray(res.data?.messages)) history = res.data.messages;
        } catch {}
      }
      const fallback = loadLocal('ask');
      const hist = (history && history.length ? history : fallback) || [];
      const trimmed = hist.slice(-20);
      if (!cancelled) {
        setMessages(trimmed.length ? [ASK_WELCOME, ...trimmed] : [ASK_WELCOME]);
        initialized.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!initialized.current) return;
    const saved = messages.filter((m, i) => !(i === 0 && m === ASK_WELCOME));
    saveLocal('ask', saved);
  }, [messages]);

  const callAsk = async (userMsg, regenerate = false, slicedHistory = null) => {
    const history = slicedHistory ?? messages
      .filter((m, i) => !(i === 0 && m === ASK_WELCOME))
      .slice(-10);
    const res = await API.post('/ai/chat', { message: userMsg, history, regenerate });
    return res.data.reply || res.data.content;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const reply = await callAsk(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I apologize, I encountered an issue. Please try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (assistantIdx) => {
    if (loading) return;
    const prevUserIdx = assistantIdx - 1;
    if (prevUserIdx < 0 || messages[prevUserIdx]?.role !== 'user') return;
    const userMsg = messages[prevUserIdx].content;
    const startIdx = messages[0] === ASK_WELCOME ? 1 : 0;
    const history = messages.slice(startIdx, prevUserIdx).slice(-10);
    // Clear existing answer and show loading
    setMessages(prev => prev.map((m, i) => (i === assistantIdx ? { ...m, content: '' } : m)));
    setRegenIdx(assistantIdx);
    setLoading(true);
    try {
      const reply = await callAsk(userMsg, true, history);
      setMessages(prev => prev.map((m, i) => (i === assistantIdx ? { ...m, content: reply } : m)));
    } catch {
      setMessages(prev => prev.map((m, i) => (i === assistantIdx ? { ...m, content: 'Regeneration failed. Please try again.' } : m)));
    } finally {
      setLoading(false);
      setRegenIdx(null);
    }
  };

  const handleDeletePair = (assistantIdx) => {
    const prevUserIdx = assistantIdx - 1;
    setMessages(prev => prev.filter((_, i) => i !== prevUserIdx && i !== assistantIdx));
  };

  const handleClear = async () => {
    setShowClearPopup(false);
    if (user) { try { await API.delete('/ai/chats?mode=ask'); } catch {} }
    clearLocal('ask');
    setMessages([ASK_WELCOME]);
  };

  const suggestions = [
    'Best destinations for a winter wedding?',
    'Budget breakdown for 200 guests in Udaipur',
    'How to plan a 3-day wedding timeline?',
    'Recommend vendors for a beach wedding'
  ];
  const hasUserMessages = messages.some(m => m.role === 'user');

  return (
    <div className="flex flex-col flex-1" style={{ minHeight: 0, maxHeight: 'calc(100vh - 260px)' }}>
      {/* Chat messages - bounded scrollable container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gold/20 rounded-full flex items-center justify-center">
                      <FiCpu className="w-3 h-3 text-gold" />
                    </div>
                    <span className="text-xs text-gray-400 font-medium">Wedding Assistant</span>
                  </div>
                )}
                <div className={`px-5 py-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-gold text-white rounded-br-md'
                    : 'bg-white border border-gray-100 text-dark shadow-sm rounded-bl-md'
                }`}>
                  {msg.role === 'user'
                    ? <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>{msg.content}</p>
                    : <MarkdownMessage content={msg.content} navigate={navigate} />
                  }
                </div>
                {msg.role === 'assistant' && msg !== ASK_WELCOME && (
                  <div className="flex gap-3 mt-1.5 ml-1">
                    <button
                      onClick={() => handleRegenerate(i)}
                      disabled={loading}
                      title="Regenerate answer"
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gold disabled:opacity-40 transition-colors"
                    >
                      <FiRefreshCw className={`w-3 h-3 ${regenIdx === i ? 'animate-spin' : ''}`} />
                      Regenerate
                    </button>
                    <button
                      onClick={() => handleDeletePair(i)}
                      disabled={loading}
                      title="Delete this Q&A"
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-400 disabled:opacity-40 transition-colors"
                    >
                      <FiTrash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && regenIdx === null && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {!hasUserMessages && (
        <div className="px-4 pb-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Try:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-gold hover:text-gold transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex gap-3 items-center">
          {hasUserMessages && (
            <button
              onClick={() => setShowClearPopup(true)}
              title="Clear chat"
              className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything about wedding planning..."
            className="flex-1 px-5 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-5 py-3.5 bg-gold text-white rounded-xl font-medium text-sm hover:bg-gold/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
          >
            <FiSend className="w-4 h-4" /> Send
          </button>
        </div>
      </div>

      {/* Clear chat popup */}
      <ConfirmPopup
        open={showClearPopup}
        message="Are you sure you want to clear this entire conversation? This cannot be undone."
        onConfirm={handleClear}
        onCancel={() => setShowClearPopup(false)}
      />
    </div>
  );
}