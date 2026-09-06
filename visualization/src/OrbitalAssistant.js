import React, { useEffect, useRef, useState } from "react";
import "./OrbitalAssistant.css";

const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

const QUICK_ACTIONS = [
  "Highest risk",
  "Collision analysis",
  "Track debris",
  "Explain SGP4",
];

function OrbitalAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text:
        "Hello! I’m Orbital AI. I can help analyze debris, collision risks, orbital data and the tracker.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const closeTimerRef = useRef(null);

  /* =========================================================
     SCROLL TO LATEST MESSAGE
     ========================================================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  /* =========================================================
     FOCUS INPUT WHEN OPENED
     ========================================================= */

  useEffect(() => {
    if (isOpen && !isClosing) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [isOpen, isClosing]);

  /* =========================================================
     CLEANUP CLOSE TIMER
     ========================================================= */

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  /* =========================================================
     OPEN ASSISTANT
     ========================================================= */

  const openAssistant = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    setIsClosing(false);
    setIsOpen(true);
  };

  /* =========================================================
     CLOSE ASSISTANT
     ========================================================= */

  const closeAssistant = () => {
    if (!isOpen || isClosing) {
      return;
    }

    setIsClosing(true);

    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 320);
  };

  /* =========================================================
     ADD MESSAGE
     ========================================================= */

  const addMessage = (role, text) => {
    setMessages((previous) => [
      ...previous,
      {
        id: Date.now() + Math.random(),
        role,
        text,
      },
    ]);
  };

  /* =========================================================
     SEND MESSAGE
     ========================================================= */

  const sendMessage = async (text = message) => {
    const trimmedMessage = text.trim();

    if (!trimmedMessage || isTyping) {
      return;
    }

    addMessage("user", trimmedMessage);
    setMessage("");
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE}/api/assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Assistant request failed: ${response.status}`
        );
      }

      const data = await response.json();

      const assistantReply =
        data?.reply ||
        data?.response ||
        data?.message ||
        "I couldn't generate a response right now.";

      addMessage("assistant", assistantReply);
    } catch (error) {
      console.error("Orbital AI error:", error);

      addMessage(
        "assistant",
        "The Orbital AI service is currently unavailable. Please make sure the backend is running."
      );
    } finally {
      setIsTyping(false);
    }
  };

  /* =========================================================
     FORM SUBMIT
     ========================================================= */

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  /* =========================================================
     QUICK ACTION
     ========================================================= */

  const handleQuickAction = (action) => {
    sendMessage(action);
  };

  /* =========================================================
     KEYBOARD
     ========================================================= */

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    <div
      className={`orbital-assistant ${
        isOpen ? "orbital-assistant-open" : ""
      } ${isClosing ? "orbital-assistant-closing" : ""}`}
    >
      {/* =====================================================
          CHAT WINDOW
          ===================================================== */}

      {isOpen && (
        <div
          className={`orbital-chat-window ${
            isClosing
              ? "orbital-chat-closing"
              : "orbital-chat-opening"
          }`}
        >
          {/* =================================================
              HEADER
              ================================================= */}

          <div className="orbital-chat-header">
            <div className="orbital-chat-title-area">
              <div className="orbital-ai-avatar">
                <span>✦</span>
              </div>

              <div>
                <div className="orbital-chat-title">
                  ORBITAL AI
                </div>

                <div className="orbital-chat-status">
                  <span className="orbital-status-dot" />
                  AI SYSTEM • ONLINE
                </div>
              </div>
            </div>

            <div className="orbital-chat-controls">
              

              <button
                type="button"
                className="orbital-control-button orbital-close-button"
                onClick={closeAssistant}
                aria-label="Close Orbital AI"
              >
                ×
              </button>
            </div>
          </div>

          {/* =================================================
              BODY
              ================================================= */}

          <div className="orbital-chat-body">
            <div className="orbital-chat-welcome">
              LIVE ORBITAL ASSISTANCE
            </div>

            <div className="orbital-messages">
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={`orbital-message-row ${
                    item.role === "user"
                      ? "orbital-message-user"
                      : "orbital-message-ai"
                  }`}
                >
                  {item.role === "assistant" && (
                    <div className="orbital-small-avatar">
                      ✦
                    </div>
                  )}

                  <div className="orbital-message-bubble">
                    {item.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="orbital-message-row orbital-message-ai">
                  <div className="orbital-small-avatar">
                    ✦
                  </div>

                  <div className="orbital-message-bubble orbital-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* =================================================
                QUICK ACTIONS
                ================================================= */}

            {messages.length === 1 && (
              <div className="orbital-quick-actions">
                <div className="orbital-quick-title">
                  QUICK ANALYSIS
                </div>

                <div className="orbital-quick-grid">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action}
                      type="button"
                      className="orbital-quick-button"
                      onClick={() => handleQuickAction(action)}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              INPUT
              ================================================= */}

          <form
            className="orbital-chat-input-area"
            onSubmit={handleSubmit}
          >
            <textarea
              ref={inputRef}
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask about your orbit..."
              rows={1}
              disabled={isTyping}
            />

            <button
              type="submit"
              className="orbital-send-button"
              disabled={!message.trim() || isTyping}
              aria-label="Send message"
            >
              <span>➤</span>
            </button>
          </form>
        </div>
      )}

      {/* =======================================================
          FLOATING AI BUTTON
          ======================================================= */}

      {!isOpen && (
        <button
          type="button"
          className="orbital-floating-button"
          onClick={openAssistant}
          aria-label="Open Orbital AI"
        >
          <div className="orbital-button-ring" />

          <div className="orbital-floating-icon">
            ✦
          </div>

          <span className="orbital-floating-label">
            AI
          </span>
        </button>
      )}
    </div>
  );
}

export default OrbitalAssistant;