import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, useAuth } from '../context/AuthContext';
import { FiCpu, FiTrash2, FiRefreshCw, FiCheckCircle, FiSend } from 'react-icons/fi';
import { MarkdownMessage } from '../utils/markdownRenderer';
import ConfirmPopup from './ConfirmPopup';

const AGENT_WELCOME = {
  role: 'assistant',
  content:
    "Tell me about your dream wedding — vibe, rough budget, season, guest count. Anything you share helps me match you to the perfect plan.",
  action: {
    type: 'input',
    inputType: 'text',
    placeholder: 'e.g., Royal 3-day wedding in Udaipur for 200 guests, around ₹35L'
  }
};

const STORAGE_KEY = 'pp_agent_v1';

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveLocal(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function clearLocalAgent() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export default function AgentChat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([AGENT_WELCOME]);
  const [agentState, setAgentState] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showClearPopup, setShowClearPopup] = useState(false);
  const messagesEndRef = useRef(null);
  const initialized = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  // Load history on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let history = null;
      let state = null;
      if (user) {
        try {
          const res = await API.get('/ai/chats?mode=agent');
          if (Array.isArray(res.data?.messages) && res.data.messages.length) history = res.data.messages;
        } catch {}
      }
      const local = loadLocal();
      if (!history && local?.messages?.length) history = local.messages;
      if (local?.state) state = local.state;

      if (!cancelled) {
        setMessages(history && history.length ? [AGENT_WELCOME, ...history] : [AGENT_WELCOME]);
        setAgentState(state);
        initialized.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Persist locally on change
  useEffect(() => {
    if (!initialized.current) return;
    const saved = messages.filter((m, i) => !(i === 0 && m === AGENT_WELCOME));
    saveLocal({ messages: saved.slice(-30), state: agentState });
  }, [messages, agentState]);

  const sendToAgent = async (userMessage, userMessageDisplay = userMessage) => {
    if (loading) return;
    if (userMessageDisplay) {
      setMessages(prev => [...prev, { role: 'user', content: userMessageDisplay }]);
    }
    setLoading(true);
    try {
      const res = await API.post('/ai/agent', { message: userMessage, state: agentState });
      const { reply, action, state } = res.data;
      setAgentState(state);
      const assistantMsg = { role: 'assistant', content: reply, action };
      setMessages(prev => [...prev, assistantMsg]);

      // Auto-navigate when action.type === 'navigate'
      if (action?.type === 'navigate' && action.prefill) {
        setTimeout(() => {
          if (action.flow === 'package') {
            navigate(`/book-package/${action.prefill.packageId}`, { state: { agentPrefill: action.prefill } });
          } else if (action.flow === 'custom') {
            navigate('/plan-wedding', { state: { agentPrefill: action.prefill } });
          }
        }, 1200);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble with that. Please try again.', action: null }]);
    } finally {
      setLoading(false);
      setTextInput('');
    }
  };

  const handleClearChat = async () => {
    setShowClearPopup(false);
    if (user) { try { await API.delete('/ai/chats?mode=agent'); } catch {} }
    clearLocalAgent();
    setMessages([AGENT_WELCOME]);
    setAgentState(null);
    setTextInput('');
  };

  // Determine action from the LAST assistant message
  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();
  const liveAction = lastAssistantIdx === messages.length - 1 ? messages[lastAssistantIdx]?.action : null;

  const handleOptionClick = (opt) => {
    sendToAgent(opt.value, opt.label);
  };
  const handleInputSubmit = () => {
    if (!textInput.trim()) return;
    sendToAgent(textInput.trim());
  };

  const hasMessages = messages.some(m => m.role === 'user');

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-gold to-amber-400 rounded-full flex items-center justify-center">
                      <FiCpu className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs text-gray-400 font-medium">AI Agent</span>
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
              </div>
            </div>
          ))}

          {loading && (
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

      {/* Action pane */}
      <div className="border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {/* Status indicator */}
          {(agentState?.phase && agentState.phase !== 'discovery') && (
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {agentState.phase !== 'done' && (
                  <span className="text-gold font-medium">Building your plan…</span>
                )}
                {agentState.phase === 'done' && (
                  <span className="text-green-600 font-medium flex items-center gap-1"><FiCheckCircle className="w-3 h-3" /> Plan complete</span>
                )}
              </p>
            </div>
          )}
          <ActionPane
            action={liveAction}
            loading={loading}
            textInput={textInput}
            setTextInput={setTextInput}
            onSubmit={handleInputSubmit}
            onOptionClick={handleOptionClick}
            onClearChat={() => setShowClearPopup(true)}
          />
          {/* Clear chat button below action pane */}
          {hasMessages && (
            <div className="flex justify-center mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowClearPopup(true)}
                className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors bg-gray-50 hover:bg-red-50 px-3 py-1.5 rounded-full"
              >
                <FiTrash2 className="w-3 h-3" /> Clear Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clear chat confirmation popup */}
      <ConfirmPopup
        open={showClearPopup}
        message="Are you sure you want to clear this conversation and start over? This cannot be undone."
        onConfirm={handleClearChat}
        onCancel={() => setShowClearPopup(false)}
      />
    </div>
  );
}

function ActionPane({ action, loading, textInput, setTextInput, onSubmit, onOptionClick, onClearChat }) {
  if (!action || action.type === 'message') {
    return (
      <div className="text-center text-xs text-gray-400 py-2">
        Waiting for the agent…
      </div>
    );
  }

  if (action.type === 'navigate') {
    return (
      <div className="text-center text-sm text-gold flex items-center justify-center gap-2 py-2">
        <FiCheckCircle className="w-4 h-4" />
        Redirecting to your review page… You can go back and edit the details.
      </div>
    );
  }

  if (action.type === 'reset') {
    return (
      <div className="flex justify-center py-2">
        <button
          onClick={onClearChat}
          className="px-6 py-2.5 bg-gold text-white rounded-full text-sm font-medium hover:bg-gold/90"
        >
          Plan Another Wedding
        </button>
      </div>
    );
  }

  if (action.type === 'input') {
    return (
      <div className="flex gap-3 items-center">
        <input
          type={action.inputType === 'date' ? 'date' : action.inputType === 'number' ? 'number' : 'text'}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder={action.placeholder || 'Type your answer...'}
          disabled={loading}
          autoFocus
          className="flex-1 px-5 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        />
        <button
          onClick={onSubmit}
          disabled={!textInput.trim() || loading}
          className="px-6 py-3.5 bg-gold text-white rounded-xl font-medium text-sm hover:bg-gold/90 disabled:opacity-40 transition-all flex items-center gap-1.5"
        >
          <FiSend className="w-4 h-4" /> Send
        </button>
      </div>
    );
  }

  if (action.type === 'options') {
    return (
      <div className="space-y-2">
        {/* Also allow typing a free-text response */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {action.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onOptionClick(opt)}
              disabled={loading}
              className={`text-left p-3 rounded-xl border transition-all disabled:opacity-50 ${
                opt.primary
                  ? 'border-gold bg-gold text-white hover:bg-gold/90'
                  : 'border-gray-200 bg-white hover:border-gold hover:bg-gold/5'
              }`}
            >
              <div className="flex items-start gap-3">
                {opt.image && (
                  <img src={opt.image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${opt.primary ? 'text-white' : 'text-dark'} truncate`}>
                    {opt.label}
                    {opt.recommended && <span className="ml-2 text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded">Recommended</span>}
                  </p>
                  {opt.sublabel && (
                    <p className={`text-xs ${opt.primary ? 'text-white/80' : 'text-gray-500'} mt-0.5 truncate`}>
                      {opt.sublabel}
                    </p>
                  )}
                  {opt.meta && (
                    <p className={`text-[11px] ${opt.primary ? 'text-white/70' : 'text-gray-400'} mt-1 truncate italic`}>
                      {opt.meta}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        {/* Free text input below options so user can type instead of selecting */}
        {action.allowFreeText !== false && (
          <div className="flex gap-3 items-center mt-3 pt-3 border-t border-gray-100">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && textInput.trim() && onSubmit()}
              placeholder="Or type your own response…"
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            />
            <button
              onClick={onSubmit}
              disabled={!textInput.trim() || loading}
              className="px-4 py-2.5 bg-gold text-white rounded-xl font-medium text-sm hover:bg-gold/90 disabled:opacity-40 transition-all"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
