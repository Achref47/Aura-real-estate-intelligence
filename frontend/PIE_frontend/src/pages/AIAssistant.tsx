import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useLocation } from "react-router-dom";
import "../index.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id:   number;
  role: "user" | "bot";
  text: string;
  ts:   Date;
};

// ─── Suggestion Chips ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "Why is this property overpriced?",
  "What should the seller do next?",
  "How can I reduce the risk?",
  "Is the market demand strong?",
  "Explain the confidence score",
  "What affects the fair price?",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
let msgId = 0;
const newMsg = (role: Message["role"], text: string): Message => ({
  id: ++msgId, role, text, ts: new Date(),
});

const formatTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ─── Streaming Text Hook ──────────────────────────────────────────────────────
function useStreamText(target: string, active: boolean) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!active) { setDisplayed(target); return; }
    setDisplayed("");
    let i = 0;
    const speed = target.length > 300 ? 8 : 14; // faster for long responses
    const timer = setInterval(() => {
      i++;
      setDisplayed(target.slice(0, i));
      if (i >= target.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [target, active]);

  return displayed;
}

// ─── Bot Bubble (streams text) ────────────────────────────────────────────────
function BotBubble({ msg, isLast }: { msg: Message; isLast: boolean }) {
  const displayed = useStreamText(msg.text, isLast);
  const done = displayed.length >= msg.text.length;

  return (
    <motion.div
      className="chat-row bot"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Avatar */}
      <div className="bot-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      </div>

      <div className="bot-bubble-wrap">
        {/* Label */}
        <span className="bubble-sender">PIE Assistant</span>

        <div className="chat-bubble bot-bubble">
          {displayed}
          {/* Cursor blink while streaming */}
          {!done && <span className="stream-cursor" />}
        </div>

        <span className="bubble-time">{formatTime(msg.ts)}</span>
      </div>
    </motion.div>
  );
}

// ─── User Bubble ──────────────────────────────────────────────────────────────
function UserBubble({ msg }: { msg: Message }) {
  return (
    <motion.div
      className="chat-row user"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="user-bubble-wrap">
        <span className="bubble-sender" style={{ textAlign: "right" }}>You</span>
        <div className="chat-bubble user-bubble">{msg.text}</div>
        <span className="bubble-time" style={{ textAlign: "right" }}>{formatTime(msg.ts)}</span>
      </div>
    </motion.div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div
      className="chat-row bot"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.25 }}
    >
      <div className="bot-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="typing-indicator">
        <span /><span /><span />
      </div>
    </motion.div>
  );
}

// ─── Context Card ─────────────────────────────────────────────────────────────
function ContextCard({ data }: { data: any }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;

  const items = [
    { label: "Price",     value: data.price     ? `$${Number(data.price).toLocaleString()}` : null },
    { label: "Position",  value: data.price_position },
    { label: "Decision",  value: data.decision },
    { label: "Risk",      value: data.risk_level },
    { label: "Confidence",value: data.confidence_score ? `${data.confidence_score}%` : null },
    { label: "Strength",  value: data.market_strength },
  ].filter(i => i.value);

  return (
    <motion.div
      className="context-card"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      <button className="context-card__toggle" onClick={() => setOpen(o => !o)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="context-card__dot" />
          <span className="context-card__title">Property Context Loaded</span>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s" }}
        >
          <path d="M6 9l6 6 6-6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="context-card__grid">
              {items.map(({ label, value }) => (
                <div className="context-chip" key={label}>
                  <span className="context-chip__label">{label}</span>
                  <span className="context-chip__value">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const bottomRef   = useRef<HTMLDivElement | null>(null);
  const inputRef    = useRef<HTMLInputElement | null>(null);
  const autoSentRef = useRef(false);

  const location   = useLocation();
  const reportData = (location.state as any)?.report ?? null;

  const sellerContext = useMemo(() => {
    if (!reportData) return null;
    return reportData.result ? { ...reportData, ...reportData.result } : reportData;
  }, [reportData]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildStarterQuestion = (data: any) => {
    if (!data) return "Explain this seller valuation.";
    const decision  = data.decision       || "this pricing strategy";
    const position  = data.price_position || "the current market position";
    return `Explain why the system recommends ${decision.toLowerCase()} based on ${position.toLowerCase()}, and tell the seller what to do next.`;
  };

  const sendMessage = useCallback(
    async (customMessage?: string, contextOverride?: any) => {
      const text = (customMessage || input).trim();
      if (!text || loading) return;

      setMessages(prev => [...prev, newMsg("user", text)]);
      setInput("");
      setLoading(true);

      try {
        const res = await axios.post("http://127.0.0.1:8000/chat", {
          message: text,
          context: contextOverride ?? sellerContext ?? null,
        });
        const reply = res?.data?.response || "⚠️ No response from AI.";
        setMessages(prev => [...prev, newMsg("bot", reply)]);
      } catch {
        setMessages(prev => [
          ...prev,
          newMsg("bot", "⚠️ Cannot reach the AI server. Make sure the backend is running on port 8000."),
        ]);
      }

      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [input, loading, sellerContext]
  );

  // Auto-send starter question
  useEffect(() => {
    if (!sellerContext || autoSentRef.current) return;
    autoSentRef.current = true;
    setTimeout(() => sendMessage(buildStarterQuestion(sellerContext), sellerContext), 500);
  }, [sellerContext, sendMessage]);

  const lastBotIndex = messages.reduce(
    (acc, m, i) => (m.role === "bot" ? i : acc), -1
  );

  return (
    <div className="ai-wrapper">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="ai-header">
        <div className="ai-header__inner">
          <div className="ai-header__left">
            <div className="ai-header__avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="ai-header__title">PIE Assistant</div>
              <div className="ai-header__status">
                <span className="status-dot" />
                AI-powered property advisor
              </div>
            </div>
          </div>

          {sellerContext && (
            <div className="ai-header__badge">
              <span className="context-badge-dot" />
              Context Active
            </div>
          )}
        </div>
      </div>

      {/* ── Chat Area ───────────────────────────────────────────────────── */}
      <div className="chat-area">

        {/* Context Card */}
        {sellerContext && <ContextCard data={sellerContext} />}

        {/* Empty State */}
        {messages.length === 0 && !loading && (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="empty-state__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="var(--accent-mid)" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="empty-state__title">Ask anything about this property</p>
            <p className="empty-state__sub">
              Pricing strategy, market risk, demand signals, seller next steps — I've got context.
            </p>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) =>
            msg.role === "user"
              ? <UserBubble key={msg.id} msg={msg} />
              : <BotBubble  key={msg.id} msg={msg} isLast={i === lastBotIndex} />
          )}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {loading && <TypingIndicator key="typing" />}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Suggestion Chips ────────────────────────────────────────────── */}
      <AnimatePresence>
        {messages.length === 0 && !loading && (
          <motion.div
            className="suggestions-bar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            {SUGGESTIONS.map((s, i) => (
              <motion.button
                key={s}
                className="suggestion-chip"
                onClick={() => sendMessage(s)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 + i * 0.04 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {s}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Bar ───────────────────────────────────────────────────── */}
      <div className="chat-input-container">
        <div className="chat-input-box">
          <input
            ref={inputRef}
            placeholder="Ask about pricing, risk, market demand…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={loading}
          />
          <motion.button
            className={`send-btn ${(!input.trim() || loading) ? "send-btn--disabled" : ""}`}
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            whileHover={input.trim() && !loading ? { scale: 1.04 } : {}}
            whileTap={input.trim() && !loading ? { scale: 0.96 } : {}}
          >
            {loading ? (
              <span className="send-spinner" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </motion.button>
        </div>
        <p className="input-hint">Press Enter to send · PIE AI analyses based on your property data</p>
      </div>

    </div>
  );
}
