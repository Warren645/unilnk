
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './App.css';

// ==================== API BASE URL ====================
const API_BASE =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://unilnk-backend-api.onrender.com';

// ==================== AUTH HEADERS ====================
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');

  return token ? { Authorization: `Bearer ${token}` } : {};
};

const CATEGORIES = [
  'All',
  'Textbooks & Books',
  'Clothing & Apparel',
  'Electronics & Tech',
  'Furniture & Home',
  'Stationery & Supplies',
  'Sports & Outdoors',
  'Services & Tutoring',
  'Other',
];

const CAMPUSES = [
  'Silverest Main Campus',
  'Leopards Hill Campus',
  'Mass Media Campus',
];

// Theme Constants
const THEME = {
  unilusGreen: '#004D25',
  unilusDarkGreen: '#003318',
  emerald: '#10B981',
  goldAccent: '#F59E0B',
  bgDark: '#0B1320',
  cardBg: 'rgba(21, 34, 56, 0.75)',
  borderGreen: 'rgba(0, 102, 51, 0.6)',
  textMain: '#F8FAFC',
  textMuted: '#94A3B8',
  textLight: '#E2E8F0',
  goldLight: '#FCD34D',
  warning: '#F59E0B',
  success: '#10B981',
  danger: '#EF4444',
};


// ==================== PASSWORD RULES & STRENGTH ====================
const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0-9)', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'One special character (!@#$%^&* etc.)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const COMMON_PASSWORDS = [
  'password', 'password1', 'password123', 'qwerty', 'qwerty123',
  '12345678', '123456789', 'iloveyou', 'admin123', 'welcome1',
  'letmein', 'unilus', 'unilus123', 'abc12345',
];

const evaluatePassword = (password) => {
  const results = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) }));
  const allRulesMet = results.every((r) => r.passed);

  if (!password) {
    return { results, allRulesMet: false, score: 0, label: '', color: 'transparent', percent: 0 };
  }

  let score = results.filter((r) => r.passed).length; // 0-5
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/(.)\1{2,}/.test(password)) score -= 1; // aaa, 111
  if (COMMON_PASSWORDS.some((c) => password.toLowerCase().includes(c))) score = Math.min(score, 2);
  if (!allRulesMet) score = Math.min(score, 3);

  // Map to 4 levels
  let level;
  if (score <= 2) level = 0;
  else if (score <= 4) level = 1;
  else if (score <= 5) level = 2;
  else level = 3;

  const levels = [
    { label: 'Weak', color: '#EF4444', percent: 25 },
    { label: 'Fair', color: '#F59E0B', percent: 50 },
    { label: 'Good', color: '#84CC16', percent: 75 },
    { label: 'Strong', color: '#10B981', percent: 100 },
  ];

  return { results, allRulesMet, score, ...levels[level] };
};

// ==================== PASSWORD FIELD (show/hide + strength) ====================
const PasswordField = ({ value, onChange, showStrength, placeholder = 'Password', autoComplete }) => {
  const [visible, setVisible] = useState(false);
  const strength = useMemo(() => evaluatePassword(value), [value]);

  return (
    <div className="password-field">
      <div className="password-input-wrap">
        <input
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          required
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          maxLength={72}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>

      {showStrength && value && (
        <div className="password-strength" aria-live="polite">
          <div className="strength-bar">
            <div
              className="strength-bar-fill"
              style={{ width: `${strength.percent}%`, background: strength.color }}
            />
          </div>
          <span className="strength-label" style={{ color: strength.color }}>
            {strength.label}
          </span>
        </div>
      )}

      {showStrength && (
        <ul className="password-rules">
          {strength.results.map((r) => (
            <li key={r.id} className={r.passed ? 'rule-met' : 'rule-unmet'}>
              <span className="rule-icon">{r.passed ? '✓' : '○'}</span> {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ==================== TOAST HOOK ====================
const useToast = () => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  return { toast, showToast };
};

// ==================== TOAST COMPONENT ====================
const Toast = ({ toast }) => {
  if (!toast) return null;

  return (
    <div className="toast-container">
      <div className={`toast toast-${toast.type}`}>
        <span className="toast-icon">
          {toast.type === 'success' && '✓'}
          {toast.type === 'error' && '✕'}
          {toast.type === 'info' && 'ℹ'}
        </span>
        <span>{toast.message}</span>
      </div>
    </div>
  );
};

// ============ CHAT INBOX COMPONENT ============
const ChatInbox = ({ currentUser, onOpenChat, API_BASE }) => {
  const [conversations, setConversations] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();

      const interval = setInterval(fetchConversations, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchConversations = async () => {
    const userId = currentUser?.id || currentUser?.user?.id;
    if (!userId) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/chat/conversations/${userId}`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setConversations(data.conversations);

        const total = data.conversations.reduce(
          (sum, conv) => sum + (conv.unread_count || 0),
          0
        );

        setTotalUnread(total);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="chat-inbox-loading">
        Loading conversations...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="chat-inbox-empty">
        <span className="empty-icon">💬</span>
        <p>No conversations yet</p>
        <p className="empty-subtext">
          Start chatting with sellers by clicking "Ask Seller" on any listing
        </p>
      </div>
    );
  }

  return (
    <div className="chat-inbox">
      <div className="chat-inbox-header">
        <h3>💬 Messages</h3>

        {totalUnread > 0 && (
          <span className="unread-badge">
            {totalUnread} unread
          </span>
        )}
      </div>

      <div className="conversations-list">
        {conversations.map((conv) => (
          <div
            key={conv.user_id}
            className={`conversation-item ${
              conv.unread_count > 0 ? 'has-unread' : ''
            }`}
            onClick={() =>
              onOpenChat(conv.user_id, null, conv.user_name)
            }
          >
            <div className="conversation-avatar">
              <span>{conv.user_name?.charAt(0) || 'U'}</span>

              {conv.unread_count > 0 && (
                <span className="unread-dot">
                  {conv.unread_count}
                </span>
              )}
            </div>

            <div className="conversation-info">
              <div className="conversation-name">
                {conv.user_name || 'UNILUS Student'}
              </div>

              <div className="conversation-last-message">
                {conv.last_message || 'No messages yet'}
              </div>

              {conv.listing_title && (
                <div className="conversation-listing">
                  📦 {conv.listing_title}
                </div>
              )}
            </div>

            <div className="conversation-time">
              {conv.last_message_time && (
                <span>
                  {new Date(conv.last_message_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ CHAT MODAL COMPONENT ============
const ChatModal = ({
  isOpen,
  onClose,
  sellerId,
  sellerName,
  listingId,
  listingTitle,
  currentUser,
  API_BASE,
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { showToast } = useToast();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && sellerId && currentUser) {
      fetchMessages();
      markAsRead();

      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, sellerId, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  const fetchMessages = async () => {
    try {
      const userId = currentUser?.id || currentUser?.user?.id;

      const res = await fetch(
        `${API_BASE}/api/chat/messages/${userId}/${sellerId}`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const markAsRead = async () => {
    try {
      const userId = currentUser?.id || currentUser?.user?.id;

      await fetch(
        `${API_BASE}/api/chat/mark-read/${userId}/${sellerId}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
          },
        }
      );
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !currentUser) return;

    setIsSending(true);

    try {
      const userId = currentUser?.id || currentUser?.user?.id;

      const res = await fetch(`${API_BASE}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          sender_id: userId,
          receiver_id: sellerId,
          listing_id: listingId,
          message: newMessage.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setNewMessage('');
        fetchMessages();
      } else {
        showToast(data.error || 'Failed to send message', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div
        className="chat-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-modal-header">
          <div className="chat-header-info">
            <h3>💬 Chat with {sellerName || 'Seller'}</h3>

            {listingTitle && (
              <p className="chat-listing-title">
                About: {listingTitle}
              </p>
            )}
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="chat-messages-container">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <span>💬</span>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const userId = currentUser?.id || currentUser?.user?.id;
                const isSent = msg.sender_id === userId;

                return (
                  <div
                    key={index}
                    className={`chat-message ${
                      isSent ? 'sent' : 'received'
                    }`}
                  >
                    <div className="message-bubble">
                      <span className="sender-name">
                        {msg.sender_name || 'Student'}
                      </span>

                      <span className="message-text">
                        {msg.message}
                      </span>

                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <form onSubmit={sendMessage} className="chat-input-form">
          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="chat-input"
            disabled={isSending}
          />

          <button
            type="submit"
            className="chat-send-btn"
            disabled={isSending}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============ LISTING CARD ============
const ListingCard = ({
  item,
  onOpenChat,
  currentUser,
  onViewSellerListings,
}) => {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  let images = [];

  try {
    if (item.image_url) {
      images =
        typeof item.image_url === 'string' &&
        item.image_url.startsWith('[')
          ? JSON.parse(item.image_url)
          : [item.image_url];
    }
  } catch {
    images = [item.image_url];
  }

  const handleChatClick = () => {
    if (!currentUser) {
      onOpenChat(null, null, null, true);
      return;
    }

    onOpenChat(
      item.seller_id,
      item.id,
      item.seller_name || 'Seller'
    );
  };

  return (
    <div
      className={`listing-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        border: `1px solid ${
          isHovered ? THEME.emerald : THEME.borderGreen
        }`,
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: THEME.cardBg,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: isHovered
          ? '0 12px 24px rgba(0, 77, 37, 0.35)'
          : '0 4px 12px rgba(0, 0, 0, 0.4)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div>
        <div
          style={{
            width: '100%',
            height: '180px',
            backgroundColor: '#090D16',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {images.length > 0 && images[activeImgIndex] ? (
            <img
              src={images[activeImgIndex]}
              alt={item.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <span
              style={{
                color: THEME.textMuted,
                fontSize: '13px',
              }}
            >
              No Image Available
            </span>
          )}

          <span
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: 'rgba(11, 19, 32, 0.85)',
              border: `1px solid ${THEME.goldAccent}`,
              color: THEME.goldAccent,
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '10px',
              fontWeight: 'bold',
              backdropFilter: 'blur(4px)',
            }}
          >
            📍 {item.campus || 'Silverest Main Campus'}
          </span>

          {images.length > 1 && (
            <>
              <button
                onClick={() =>
                  setActiveImgIndex((prev) =>
                    prev === 0 ? images.length - 1 : prev - 1
                  )
                }
                style={{
                  position: 'absolute',
                  left: '8px',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ‹
              </button>

              <button
                onClick={() =>
                  setActiveImgIndex((prev) =>
                    prev === images.length - 1 ? 0 : prev + 1
                  )
                }
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ›
              </button>

              <div
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  display: 'flex',
                  gap: '4px',
                }}
              >
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor:
                        idx === activeImgIndex
                          ? THEME.emerald
                          : 'rgba(255,255,255,0.5)',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '15px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                color: THEME.textMain,
                fontWeight: '600',
              }}
            >
              {item.title}
            </h3>

            <span
              style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold',
                backgroundColor:
                  item.quantity > 0
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                color:
                  item.quantity > 0 ? THEME.emerald : '#FCA5A5',
                border: `1px solid ${
                  item.quantity > 0
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)'
                }`,
              }}
            >
              {item.quantity > 0
                ? `In Stock (${item.quantity})`
                : 'Sold Out'}
            </span>
          </div>

          {item.description && (
            <p
              style={{
                margin: '0 0 10px 0',
                color: THEME.textMuted,
                fontSize: '13px',
                lineHeight: '1.4',
              }}
            >
              {item.description}
            </p>
          )}

          <p
            style={{
              margin: '0 0 5px 0',
              color: THEME.textMuted,
              fontSize: '12px',
            }}
          >
            Category:{' '}
            <strong style={{ color: '#E2E8F0' }}>
              {item.category}
            </strong>
          </p>

          {/* FEATURE 3 - CLICKABLE SELLER NAME */}
          <p
            style={{
              margin: '0 0 5px 0',
              color: THEME.textMuted,
              fontSize: '12px',
            }}
          >
            👤 Seller:{' '}
            <strong
              style={{
                color: '#E2E8F0',
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationColor: THEME.emerald,
                textUnderlineOffset: '2px',
                transition: 'color 0.2s ease',
              }}
              onClick={() =>
                onViewSellerListings(item.seller_id, item.seller_name)
              }
              onMouseEnter={(e) =>
                (e.target.style.color = THEME.emerald)
              }
              onMouseLeave={(e) =>
                (e.target.style.color = '#E2E8F0')
              }
              title="Click to see all listings by this seller"
            >
              {item.seller_name || 'UNILUS Student'}
            </strong>
          </p>

          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: '18px',
              fontWeight: 'bold',
              color: THEME.emerald,
            }}
          >
            ZMW {item.price}
          </p>
        </div>
      </div>

      <div style={{ padding: '0 15px 15px 15px' }}>
        <button
          onClick={handleChatClick}
          disabled={!currentUser}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'transparent',
            color: currentUser ? THEME.goldAccent : THEME.textMuted,
            border: `1px solid ${
              currentUser ? THEME.goldAccent : '#475569'
            }`,
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: currentUser ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
          title={
            !currentUser
              ? 'Please login to chat'
              : 'Ask seller about this item'
          }
        >
          💬 Ask Seller
        </button>
      </div>
    </div>
  );
};

// ============ AUTH MODAL ============
const AuthModal = ({ isOpen, onClose, onAuthSuccess, showToast }) => {
  const [isRegister, setIsRegister] = useState(false);

  const [authData, setAuthData] = useState({
    full_name: '',
    email: '',
    password: '',
    student_id: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isRegister && !evaluatePassword(authData.password).allRulesMet) {
      showToast('Please meet all the password requirements.', 'error');
      return;
    }

    setIsLoading(true);

    const endpoint = isRegister
      ? '/api/auth/register'
      : '/api/auth/login';

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authData),
      });

      const data = await res.json();

      if (data.success) {
        if (isRegister) {
          showToast(
            'Registration successful! Please sign in.',
            'success'
          );
          setIsRegister(false);
        } else {
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('token', data.token);

          onAuthSuccess(data.user);

          showToast(
            `Welcome, ${data.user.full_name || data.user.email}!`,
            'success'
          );

          onClose();
        }
      } else {
        showToast(data.error || 'Authentication failed', 'error');
      }
    } catch (err) {
      showToast('Connection error. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="auth-header">
          <div className="auth-logo">U</div>

          <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>

          <p>
            {isRegister
              ? 'Join the UNILUS student marketplace'
              : 'Sign in to your student account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                required
                value={authData.full_name}
                onChange={(e) =>
                  setAuthData({
                    ...authData,
                    full_name: e.target.value,
                  })
                }
              />

              <input
                type="text"
                placeholder="Student ID (e.g. UNILUS-2024-001)"
                required
                value={authData.student_id}
                onChange={(e) =>
                  setAuthData({
                    ...authData,
                    student_id: e.target.value,
                  })
                }
              />
            </>
          )}

          <input
            type="email"
            placeholder="Student Email (@unilus.ac.zm)"
            required
            value={authData.email}
            onChange={(e) =>
              setAuthData({
                ...authData,
                email: e.target.value,
              })
            }
          />

          <PasswordField
            value={authData.password}
            showStrength={isRegister}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            onChange={(e) =>
              setAuthData({
                ...authData,
                password: e.target.value,
              })
            }
          />

          <button
            type="submit"
            disabled={
              isLoading ||
              (isRegister && !evaluatePassword(authData.password).allRulesMet)
            }
            className="auth-submit-btn"
          >
            {isLoading
              ? 'Processing...'
              : isRegister
                ? 'Create Account'
                : 'Sign In'}
          </button>
        </form>

        <p
          className="auth-toggle"
          onClick={() => setIsRegister(!isRegister)}
        >
          {isRegister
            ? 'Already have an account? Sign in'
            : 'Need an account? Sign up'}
        </p>
      </div>
    </div>
  );
};

// ============ ADMIN MODERATION ============
const REMOVAL_REASONS = [
  'Weapons',
  'Drugs or alcohol',
  'Academic dishonesty',
  'Fake or counterfeit items',
  'Stolen goods',
  'Adult or inappropriate content',
  'Scam or misleading',
  'Spam or duplicate',
  'Other prohibited item',
];

const parseImages = (imageUrl) => {
  if (!imageUrl) return [];

  try {
    if (typeof imageUrl === 'string' && imageUrl.startsWith('[')) {
      const parsed = JSON.parse(imageUrl);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    return [];
  }

  return [imageUrl];
};

const formatDate = (value) => {
  if (!value) return '';

  return new Date(value).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Wraps flagged words in <mark> so admins can spot them quickly.
const Highlight = ({ text, terms }) => {
  if (!text) return null;
  if (!terms || terms.length === 0) return <>{text}</>;

  const escaped = terms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')
  );
  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="adm-mark">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

const AdminPanel = ({ showToast, onListingsChanged }) => {
  const [view, setView] = useState('listings');

  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    total_pages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('All');
  const [campus, setCampus] = useState('All');
  const [page, setPage] = useState(1);

  const [expandedId, setExpandedId] = useState(null);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [notifySeller, setNotifySeller] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);

  const [logEntries, setLogEntries] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logPagination, setLogPagination] = useState({
    total: 0,
    total_pages: 1,
  });
  const [isLogLoading, setIsLogLoading] = useState(false);

  // Wait for the admin to stop typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load moderation overview:', err);
    }
  }, []);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    const params = new URLSearchParams({
      page: String(page),
      limit: '12',
      status,
      category,
      campus,
    });

    if (search) params.set('search', search);

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/listings?${params.toString()}`,
        { headers: { ...getAuthHeaders() } }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setListings(data.listings);
        setPagination(data.pagination);
      } else {
        setLoadError(data.error || 'Unable to load listings.');
      }
    } catch (err) {
      console.error('Failed to load admin listings:', err);
      setLoadError('Could not reach the server. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [page, status, category, campus, search]);

  const fetchLog = useCallback(async () => {
    setIsLogLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/moderation-log?page=${logPage}&limit=15`,
        { headers: { ...getAuthHeaders() } }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setLogEntries(data.entries);
        setLogPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load moderation log:', err);
    } finally {
      setIsLogLoading(false);
    }
  }, [logPage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (view === 'listings') fetchListings();
  }, [view, fetchListings]);

  useEffect(() => {
    if (view === 'log') fetchLog();
  }, [view, fetchLog]);

  const changeStatus = (next) => {
    setStatus(next);
    setPage(1);
    setExpandedId(null);
  };

  const openRemove = (item) => {
    setRemoveTarget(item);
    setReason('');
    setNote('');
    setNotifySeller(true);
  };

  const closeRemove = () => {
    if (isRemoving) return;
    setRemoveTarget(null);
  };

  const confirmRemove = async () => {
    if (!removeTarget || !reason) return;

    setIsRemoving(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/listings/${removeTarget.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            reason,
            note,
            notify_seller: notifySeller,
          }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(
          data.seller_notified
            ? 'Listing removed and seller notified.'
            : 'Listing removed.',
          'success'
        );

        setRemoveTarget(null);
        setExpandedId(null);

        await Promise.all([
          fetchListings(),
          fetchStats(),
          onListingsChanged(),
        ]);
      } else {
        showToast(data.error || 'Failed to remove listing.', 'error');

        // The listing may already be gone; refresh the queue.
        if (res.status === 404) {
          setRemoveTarget(null);
          fetchListings();
          fetchStats();
        }
      }
    } catch (err) {
      console.error('Failed to remove listing:', err);
      showToast('Failed to remove listing. Check your connection.', 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  const STATUS_FILTERS = [
    { key: 'all', label: 'All listings' },
    { key: 'flagged', label: 'Flagged', count: stats?.flagged_listings },
    { key: 'active', label: 'Active' },
    { key: 'sold', label: 'Sold' },
  ];

  const hasFilters =
    search || status !== 'all' || category !== 'All' || campus !== 'All';

  return (
    <div className="adm">
      <div className="adm-head">
        <div>
          <h2 className="adm-title">Moderation</h2>
          <p className="adm-sub">
            Review listings and remove anything that breaks the marketplace
            rules.
          </p>
        </div>

        <div className="adm-views">
          <button
            className={`adm-view-btn ${view === 'listings' ? 'active' : ''}`}
            onClick={() => setView('listings')}
          >
            Listings
          </button>
          <button
            className={`adm-view-btn ${view === 'log' ? 'active' : ''}`}
            onClick={() => setView('log')}
          >
            Removal history
          </button>
        </div>
      </div>

      {stats && (
        <div className="adm-stats">
          <button
            className={`adm-stat adm-stat-flag ${
              stats.flagged_listings > 0 ? 'has-flags' : ''
            }`}
            onClick={() => {
              setView('listings');
              changeStatus('flagged');
            }}
          >
            <span className="adm-stat-num">{stats.flagged_listings}</span>
            <span className="adm-stat-label">Need review</span>
          </button>

          <div className="adm-stat">
            <span className="adm-stat-num">{stats.active_listings}</span>
            <span className="adm-stat-label">Active listings</span>
          </div>

          <div className="adm-stat">
            <span className="adm-stat-num">{stats.removed_7d}</span>
            <span className="adm-stat-label">Removed this week</span>
          </div>

          <div className="adm-stat">
            <span className="adm-stat-num">{stats.total_users}</span>
            <span className="adm-stat-label">Students</span>
          </div>
        </div>
      )}

      {view === 'listings' && (
        <>
          <div className="adm-toolbar">
            <input
              type="text"
              className="search-input"
              placeholder="Search by title, seller name, email or student ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />

            <select
              className="filter-select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All categories' : cat}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={campus}
              onChange={(e) => {
                setCampus(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All campuses</option>
              {CAMPUSES.map((camp) => (
                <option key={camp} value={camp}>
                  {camp}
                </option>
              ))}
            </select>
          </div>

          <div className="adm-pills">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                className={`adm-pill ${status === f.key ? 'active' : ''}`}
                onClick={() => changeStatus(f.key)}
              >
                {f.label}
                {f.count > 0 && (
                  <span className="adm-pill-count">{f.count}</span>
                )}
              </button>
            ))}

            <span className="adm-result-count">
              {pagination.total} result{pagination.total === 1 ? '' : 's'}
            </span>
          </div>

          {loadError ? (
            <div className="adm-empty">
              <p>{loadError}</p>
              <button className="adm-btn adm-btn-ghost" onClick={fetchListings}>
                Try again
              </button>
            </div>
          ) : isLoading && listings.length === 0 ? (
            <div className="adm-empty">
              <p>Loading listings...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="adm-empty">
              <span className="adm-empty-icon">
                {status === 'flagged' ? '✅' : '🔍'}
              </span>
              <p>
                {status === 'flagged' && !hasFilters
                  ? 'Nothing flagged right now.'
                  : 'No listings match these filters.'}
              </p>
              {status === 'flagged' && !hasFilters && (
                <p className="adm-empty-sub">
                  Flags come from a keyword check. Browse all listings to
                  review anything it might miss.
                </p>
              )}
            </div>
          ) : (
            <div className={`adm-list ${isLoading ? 'is-loading' : ''}`}>
              {listings.map((item) => {
                const images = parseImages(item.image_url);
                const isOpen = expandedId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`adm-row ${item.is_flagged ? 'flagged' : ''} ${
                      isOpen ? 'open' : ''
                    }`}
                  >
                    <div className="adm-row-main">
                      <div className="adm-thumb">
                        {images[0] ? (
                          <img
                            src={images[0]}
                            alt=""
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>No photo</span>
                        )}
                      </div>

                      <div className="adm-info">
                        <div className="adm-info-top">
                          <h3 className="adm-item-title">
                            <Highlight
                              text={item.title}
                              terms={item.flagged_terms}
                            />
                          </h3>

                          <div className="adm-badges">
                            {item.is_flagged && (
                              <span className="adm-badge adm-badge-flag">
                                Flagged
                              </span>
                            )}
                            {item.is_sold && (
                              <span className="adm-badge adm-badge-sold">
                                Sold
                              </span>
                            )}
                            {item.seller_prior_removals > 0 && (
                              <span className="adm-badge adm-badge-repeat">
                                {item.seller_prior_removals} earlier removal
                                {item.seller_prior_removals === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="adm-meta">
                          ZMW {item.price} · {item.category || 'Other'} ·{' '}
                          {item.campus || 'No campus'} ·{' '}
                          {formatDate(item.created_at)}
                        </p>

                        <p className="adm-seller">
                          Seller: <strong>{item.seller_name || 'Unknown'}</strong>
                          {item.seller_email && (
                            <span className="adm-seller-detail">
                              {item.seller_email}
                            </span>
                          )}
                        </p>

                        {item.flagged_terms.length > 0 && (
                          <p className="adm-flag-reason">
                            Matched:{' '}
                            {item.flagged_terms.map((t) => (
                              <span key={t} className="adm-term">
                                {t}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>

                      <div className="adm-actions">
                        <button
                          className="adm-btn adm-btn-ghost"
                          onClick={() =>
                            setExpandedId(isOpen ? null : item.id)
                          }
                        >
                          {isOpen ? 'Hide details' : 'View details'}
                        </button>

                        <button
                          className="adm-btn adm-btn-danger"
                          onClick={() => openRemove(item)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="adm-details">
                        <div className="adm-detail-block">
                          <h4>Description</h4>
                          <p className="adm-desc">
                            {item.description ? (
                              <Highlight
                                text={item.description}
                                terms={item.flagged_terms}
                              />
                            ) : (
                              'The seller did not add a description.'
                            )}
                          </p>
                        </div>

                        {images.length > 0 && (
                          <div className="adm-detail-block">
                            <h4>
                              Photos ({images.length}) — tap to open full size
                            </h4>
                            <div className="adm-gallery">
                              {images.map((src, idx) => (
                                <a
                                  key={idx}
                                  href={src}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="adm-gallery-item"
                                >
                                  <img src={src} alt={`${item.title} ${idx + 1}`} />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="adm-detail-block">
                          <h4>Seller</h4>
                          <p className="adm-desc">
                            {item.seller_name || 'Unknown'}
                            {item.seller_student_id &&
                              ` · ID ${item.seller_student_id}`}
                            {item.seller_email && ` · ${item.seller_email}`}
                            {' · '}Stock: {item.quantity}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {pagination.total_pages > 1 && (
            <div className="adm-pager">
              <button
                className="adm-btn adm-btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                className="adm-btn adm-btn-ghost"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {view === 'log' && (
        <>
          {isLogLoading && logEntries.length === 0 ? (
            <div className="adm-empty">
              <p>Loading history...</p>
            </div>
          ) : logEntries.length === 0 ? (
            <div className="adm-empty">
              <span className="adm-empty-icon">📋</span>
              <p>No listings have been removed yet.</p>
              <p className="adm-empty-sub">
                Every removal will be recorded here with the reason and who
                made it.
              </p>
            </div>
          ) : (
            <div className="adm-list">
              {logEntries.map((entry) => (
                <div key={entry.id} className="adm-log-row">
                  <div className="adm-log-main">
                    <strong>{entry.listing_title || 'Deleted listing'}</strong>
                    <span className="adm-log-reason">{entry.reason}</span>
                  </div>

                  <p className="adm-meta">
                    Seller: {entry.seller_name || 'Unknown'} · Removed by{' '}
                    {entry.admin_name || 'an admin'} ·{' '}
                    {new Date(entry.created_at).toLocaleString([], {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {entry.seller_notified
                      ? ' · Seller notified'
                      : ' · Seller not notified'}
                  </p>

                  {entry.note && (
                    <p className="adm-log-note">Note: {entry.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {logPagination.total_pages > 1 && (
            <div className="adm-pager">
              <button
                className="adm-btn adm-btn-ghost"
                disabled={logPage <= 1}
                onClick={() => setLogPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>
                Page {logPage} of {logPagination.total_pages}
              </span>
              <button
                className="adm-btn adm-btn-ghost"
                disabled={logPage >= logPagination.total_pages}
                onClick={() => setLogPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {removeTarget && (
        <div className="modal-overlay" onClick={closeRemove}>
          <div
            className="modal-content adm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeRemove}>
              ×
            </button>

            <h3 className="adm-modal-title">Remove this listing?</h3>
            <p className="adm-modal-sub">
              <strong>{removeTarget.title}</strong> by{' '}
              {removeTarget.seller_name || 'Unknown'} will be deleted
              permanently, along with its photos.
            </p>

            <p className="adm-modal-label">Why is it being removed?</p>
            <div className="adm-reasons">
              {REMOVAL_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`adm-reason ${reason === r ? 'active' : ''}`}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>

            <label className="adm-modal-label" htmlFor="adm-note">
              Note to seller (optional)
            </label>
            <textarea
              id="adm-note"
              className="form-textarea"
              rows="3"
              maxLength={500}
              placeholder="Add context that helps the seller understand what to change."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <label className="adm-check">
              <input
                type="checkbox"
                checked={notifySeller}
                onChange={(e) => setNotifySeller(e.target.checked)}
              />
              <span>Send the seller a message explaining the removal</span>
            </label>

            <div className="adm-modal-actions">
              <button
                className="adm-btn adm-btn-ghost"
                onClick={closeRemove}
                disabled={isRemoving}
              >
                Cancel
              </button>

              <button
                className="adm-btn adm-btn-danger solid"
                onClick={confirmRemove}
                disabled={!reason || isRemoving}
              >
                {isRemoving ? 'Removing...' : 'Remove listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ MAIN APP ============
function App() {
  const [listings, setListings] = useState([]);

  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem('user')) || null
  );

  const [activeTab, setActiveTab] = useState('browse');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [chatModal, setChatModal] = useState({
    isOpen: false,
    sellerId: null,
    listingId: null,
    listingTitle: '',
  });

  const [lastMessageCount, setLastMessageCount] = useState(0);

  // FEATURE 3 - Seller Filter State
  const [sellerFilter, setSellerFilter] = useState(null);
  const [sellerName, setSellerName] = useState('');

  const { toast, showToast } = useToast();

  const isAdmin = currentUser?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCampus, setSelectedCampus] = useState('All');

  const [sellerListings, setSellerListings] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [editForm, setEditForm] = useState({
    price: '',
    quantity: '',
  });

  const initialListingState = {
    title: '',
    description: '',
    price: '',
    quantity: 1,
    category: 'Clothing & Apparel',
    campus: CAMPUSES[0],
  };

  const [newListing, setNewListing] = useState(initialListingState);
  const [imageFiles, setImageFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // ==================== FETCH PUBLIC LISTINGS ====================
  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/listings`);
      const data = await res.json();

      if (data.success) {
        setListings(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch listings:', err);

      showToast(
        'Failed to connect to server. Check your connection.',
        'error'
      );
    }
  }, [showToast]);

  // ==================== FETCH SELLER LISTINGS ====================
  const fetchSellerListings = useCallback(async () => {
    const userId = currentUser?.id || currentUser?.user?.id;
    if (!userId) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/users/${userId}/listings`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setSellerListings(data.listings);
      } else {
        showToast(
          data.error || 'Failed to load your listings.',
          'error'
        );
      }
    } catch (err) {
      console.error('Failed to load seller listings:', err);
    }
  }, [currentUser, showToast]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Refresh the account (including admin role) for sessions saved
  // before roles existed, or after a role change.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const refreshAccount = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { ...getAuthHeaders() },
        });
        const data = await res.json();

        if (res.ok && data.success) {
          localStorage.setItem('user', JSON.stringify(data.user));
          setCurrentUser((prev) =>
            prev ? { ...prev, ...data.user } : prev
          );
        }
      } catch (err) {
        console.error('Failed to refresh account:', err);
      }
    };

    refreshAccount();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchSellerListings();
    } else {
      setSellerListings([]);
    }
  }, [currentUser, fetchSellerListings]);

  // ==================== CHAT NOTIFICATIONS ====================
  useEffect(() => {
    if (!currentUser) return;

    const checkNotifications = async () => {
      const userId = currentUser?.id || currentUser?.user?.id;

      try {
        const res = await fetch(
          `${API_BASE}/api/chat/unread/total/${userId}`,
          {
            headers: {
              ...getAuthHeaders(),
            },
          }
        );

        const data = await res.json();

        if (
          data.success &&
          data.total_unread > lastMessageCount
        ) {
          playNotificationSound();

          if (
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification('📩 New Message on UniLnk', {
              body: `You have ${data.total_unread} unread message(s)`,
              icon: '/favicon.ico',
            });
          }

          showToast(
            `📩 You have ${data.total_unread} new message(s)`,
            'info'
          );
        }

        setLastMessageCount(data.total_unread || 0);
      } catch (err) {
        console.error('Failed to check notifications:', err);
      }
    };

    if (
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission();
    }

    checkNotifications();

    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentUser, lastMessageCount, showToast]);

  const playNotificationSound = () => {
    try {
      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();

      [800, 1000, 1200].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.frequency.value = freq;
        osc.type = 'sine';

        gain.gain.setValueAtTime(
          0.08,
          audioContext.currentTime + i * 0.1
        );

        osc.start(audioContext.currentTime + i * 0.1);
        osc.stop(audioContext.currentTime + i * 0.1 + 0.08);
      });
    } catch (err) {
      // Notification sound is optional.
    }
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    setCurrentUser(null);
    setSellerListings([]);
    setEditingId(null);
    setActiveTab('browse');

    showToast('Logged out successfully', 'info');
  };

  // ==================== DELETE LISTING ====================
  const handleDeleteListing = async (listingId) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this listing?'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/listings/${listingId}`,
        {
          method: 'DELETE',
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Listing removed successfully.', 'info');

        if (editingId === listingId) {
          setEditingId(null);
        }

        await Promise.all([
          fetchSellerListings(),
          fetchListings(),
        ]);
      } else {
        showToast(
          data.error || 'Failed to delete listing.',
          'error'
        );
      }
    } catch (err) {
      console.error('Failed to delete listing:', err);
      showToast('Failed to delete listing.', 'error');
    }
  };

  // ==================== MARK LISTING AS SOLD ====================
  const handleMarkAsSold = async (listingId) => {
    const confirmed = window.confirm(
      'Are you sure you want to mark this item as sold? It will be removed from the marketplace and automatically deleted after 5 days.'
    );

    if (!confirmed) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/listings/${listingId}/sold`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(
          data.error || 'Failed to mark listing as sold.',
          'error'
        );
        return;
      }

      // Close editing if necessary.
      setEditingId(null);

      showToast(
        'Listing marked as sold successfully!',
        'success'
      );

      // Refresh the public marketplace and seller dashboard.
      await Promise.all([
        fetchListings(),
        fetchSellerListings(),
      ]);
    } catch (err) {
      console.error('Error marking listing as sold:', err);

      showToast(
        'Failed to mark listing as sold. Check your connection.',
        'error'
      );
    }
  };

  // ==================== UPDATE LISTING ====================
  const handleUpdateListing = async (listingId) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/listings/${listingId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(editForm),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Listing updated successfully!');

        setEditingId(null);

        await Promise.all([
          fetchSellerListings(),
          fetchListings(),
        ]);
      } else {
        showToast(
          data.error || 'Failed to update listing.',
          'error'
        );
      }
    } catch (err) {
      console.error('Failed to update listing:', err);
      showToast('Failed to update listing.', 'error');
    }
  };

  // ==================== FILTER PUBLIC LISTINGS ====================
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      // Never display sold listings in the public marketplace.
      if (item.is_sold === true) {
        return false;
      }

      const term = searchTerm.toLowerCase();

      const matchesSearch =
        (item.title || '').toLowerCase().includes(term) ||
        (item.description || '').toLowerCase().includes(term);

      const matchesCategory =
        selectedCategory === 'All' ||
        item.category === selectedCategory;

      const matchesCampus =
        selectedCampus === 'All' ||
        item.campus === selectedCampus;

      const matchesSeller = sellerFilter
        ? String(item.seller_id) === String(sellerFilter)
        : true;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesCampus &&
        matchesSeller
      );
    });
  }, [
    listings,
    searchTerm,
    selectedCategory,
    selectedCampus,
    sellerFilter,
  ]);

  // ==================== VIEW SELLER LISTINGS ====================
  const handleViewSellerListings = (sellerId, sellerName) => {
    if (!sellerId) {
      showToast('Seller information not available', 'error');
      return;
    }

    setSellerFilter(sellerId);
    setSellerName(sellerName || 'Seller');

    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedCampus('All');

    showToast(
      `Showing listings by ${sellerName || 'this seller'}`,
      'info'
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const clearSellerFilter = () => {
    setSellerFilter(null);
    setSellerName('');

    showToast('Showing all listings', 'info');
  };

  // ==================== OPEN CHAT ====================
  const handleOpenChat = (
    sellerId,
    listingId,
    sellerName,
    requireLogin = false
  ) => {
    if (requireLogin || !currentUser) {
      setIsAuthModalOpen(true);

      showToast(
        'Please login to chat with sellers',
        'info'
      );

      return;
    }

    if (!sellerId) {
      showToast('Seller information not available', 'error');
      return;
    }

    setChatModal({
      isOpen: true,
      sellerId,
      listingId,
      listingTitle: sellerName || 'Seller',
    });
  };

  const handleCloseChat = () => {
    setChatModal({
      isOpen: false,
      sellerId: null,
      listingId: null,
      listingTitle: '',
    });
  };

  // ==================== CREATE LISTING ====================
  const handleCreateListing = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showToast('Please log in first.', 'error');
      return;
    }

    const sellerId = currentUser.id || currentUser.user?.id;

    if (!sellerId) {
      showToast(
        'Session issue. Please log out and sign back in.',
        'error'
      );
      return;
    }

    if (imageFiles.length > 5) {
      showToast('You can upload a maximum of 5 images.', 'error');
      return;
    }

    if (
      imageFiles.some((file) => file.size > 5 * 1024 * 1024)
    ) {
      showToast(
        'Each image must be 5MB or smaller.',
        'error'
      );
      return;
    }

    setIsLoading(true);

    const formData = new FormData();

    formData.append('title', newListing.title);
    formData.append('description', newListing.description);
    formData.append('price', newListing.price);
    formData.append('quantity', newListing.quantity);
    formData.append('category', newListing.category);
    formData.append('campus', newListing.campus);
    formData.append('seller_id', sellerId);

    for (let i = 0; i < imageFiles.length; i++) {
      formData.append('images', imageFiles[i]);
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE}/api/listings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Listing created successfully!');

        setNewListing(initialListingState);
        setImageFiles([]);

        // Clear the file input after successful submission.
        const fileInput = document.getElementById('listing-images');
        if (fileInput) fileInput.value = '';

        await Promise.all([
          fetchListings(),
          fetchSellerListings(),
        ]);

        setActiveTab('browse');
      } else {
        showToast(
          data.error || 'Failed to create listing',
          'error'
        );
      }
    } catch (err) {
      console.error('Failed to create listing:', err);

      showToast(
        'Failed to create listing. Check your connection.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== NAVIGATION TAB BUTTON ====================
  const TabButton = ({ tab, label, icon }) => (
    <button
      className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
      onClick={() => setActiveTab(tab)}
    >
      {icon && <span className="tab-icon">{icon}</span>}
      {label}
    </button>
  );

  // ==================== MAIN UI ====================
  return (
    <div className="app-container">
      <div className="accent-bar" />

      <div className="app-content">
        {/* HEADER */}
        <header className="app-header">
          <div className="header-left">
            <div className="unilus-crest">U</div>

            <div>
              <h1 className="header-title">
                UniLnk{' '}
                <span className="header-subtitle">
                  | UNILUS Student Portal
                </span>
              </h1>

              <p className="header-tagline">
                University of Lusaka Student Marketplace & Services
              </p>
            </div>
          </div>

          <div className="header-right">
            <div className="status-indicator">
              <span className="status-dot" />
              <span className="status-text">Campus Network</span>
            </div>
          </div>
        </header>

        <Toast toast={toast} />

        {/* AUTH / USER SESSION */}
        {!currentUser ? (
          <div className="auth-prompt">
            <button
              className="auth-prompt-btn"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Student Sign In
            </button>

            <span className="auth-prompt-text">or</span>

            <button
              className="auth-prompt-btn secondary"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="user-session">
            <span className="session-text">
              Active Session:{' '}
              <strong>
                {currentUser.full_name || currentUser.email}
              </strong>
              {isAdmin && (
                <span className="admin-role-badge">Admin</span>
              )}
            </span>

            <button className="logout-btn" onClick={handleLogout}>
              Log Out
            </button>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <nav className="tab-nav">
          <TabButton
            tab="browse"
            label="Browse Marketplace"
            icon="🛍️"
          />

          {currentUser && (
            <>
              <TabButton
                tab="messages"
                label="Messages"
                icon="💬"
              />

              <TabButton
                tab="sell"
                label="Sell Item"
                icon="➕"
              />

              <TabButton
                tab="dashboard"
                label="My Dashboard"
                icon="📊"
              />
            </>
          )}

          {isAdmin && (
            <TabButton tab="admin" label="Moderation" icon="🛡️" />
          )}
        </nav>

        {/* AUTH MODAL */}
        <AuthModal
        showToast={showToast}
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* CHAT MODAL */}
        <ChatModal
          isOpen={chatModal.isOpen}
          onClose={handleCloseChat}
          sellerId={chatModal.sellerId}
          sellerName={chatModal.listingTitle}
          listingId={chatModal.listingId}
          listingTitle={chatModal.listingTitle}
          currentUser={currentUser}
          API_BASE={API_BASE}
        />

        {/* ==================== BROWSE MARKETPLACE ==================== */}
        {activeTab === 'browse' && (
          <div className="tab-content">
            {sellerFilter && (
              <div className="seller-filter-banner">
                <span>
                  👤 Showing listings by{' '}
                  <strong>{sellerName || 'Seller'}</strong>
                </span>

                <button
                  className="clear-filter-btn"
                  onClick={clearSellerFilter}
                >
                  ✕ Clear Filter
                </button>
              </div>
            )}

            <div className="search-filters">
              <input
                type="text"
                placeholder="Search items by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />

              <select
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(e.target.value)
                }
                className="filter-select"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={selectedCampus}
                onChange={(e) =>
                  setSelectedCampus(e.target.value)
                }
                className="filter-select"
              >
                <option value="All">All Campuses</option>

                {CAMPUSES.map((camp) => (
                  <option key={camp} value={camp}>
                    {camp}
                  </option>
                ))}
              </select>
            </div>

            <div className="listings-grid">
              {filteredListings.length === 0 ? (
                <p className="empty-state">
                  No listings found matching your criteria.
                </p>
              ) : (
                filteredListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    item={item}
                    onOpenChat={handleOpenChat}
                    currentUser={currentUser}
                    onViewSellerListings={handleViewSellerListings}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ==================== MESSAGES ==================== */}
        {activeTab === 'messages' && currentUser && (
          <div className="tab-content">
            <ChatInbox
              currentUser={currentUser}
              onOpenChat={handleOpenChat}
              API_BASE={API_BASE}
            />
          </div>
        )}

        {/* ==================== SELL ITEM ==================== */}
        {activeTab === 'sell' && currentUser && (
          <div className="tab-content">
            <div className="sell-form-container">
              <h2 className="section-title">
                Post New Item for Sale
              </h2>

              <form
                onSubmit={handleCreateListing}
                className="sell-form"
              >
                <input
                  type="text"
                  placeholder="Title (e.g. Course Textbook, Calculator)"
                  value={newListing.title}
                  required
                  className="form-input"
                  onChange={(e) =>
                    setNewListing({
                      ...newListing,
                      title: e.target.value,
                    })
                  }
                />

                <textarea
                  placeholder="Description"
                  value={newListing.description}
                  className="form-textarea"
                  onChange={(e) =>
                    setNewListing({
                      ...newListing,
                      description: e.target.value,
                    })
                  }
                  rows="3"
                />

                <div className="form-row">
                  <div className="form-group">
                    <label>Campus Location</label>

                    <select
                      value={newListing.campus}
                      className="form-select"
                      onChange={(e) =>
                        setNewListing({
                          ...newListing,
                          campus: e.target.value,
                        })
                      }
                    >
                      {CAMPUSES.map((camp) => (
                        <option key={camp} value={camp}>
                          {camp}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Category</label>

                    <select
                      value={newListing.category}
                      className="form-select"
                      onChange={(e) =>
                        setNewListing({
                          ...newListing,
                          category: e.target.value,
                        })
                      }
                    >
                      {CATEGORIES.filter((c) => c !== 'All').map(
                        (cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Price (ZMW)</label>

                    <input
                      type="number"
                      placeholder="0.00"
                      value={newListing.price}
                      required
                      min="0"
                      className="form-input"
                      onChange={(e) =>
                        setNewListing({
                          ...newListing,
                          price: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Quantity</label>

                    <input
                      type="number"
                      placeholder="1"
                      value={newListing.quantity}
                      min="1"
                      className="form-input"
                      onChange={(e) =>
                        setNewListing({
                          ...newListing,
                          quantity: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    Upload Photos (Select up to 5 images)
                  </label>

                  <input
                    id="listing-images"
                    type="file"
                    accept="image/*"
                    multiple
                    className="form-file-input"
                    onChange={(e) =>
                      setImageFiles(Array.from(e.target.files))
                    }
                  />

                  {imageFiles.length > 0 && (
                    <p className="file-count">
                      {imageFiles.length} image(s) selected
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="submit-btn"
                >
                  {isLoading ? 'Publishing...' : 'Publish Listing'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==================== ADMIN MODERATION ==================== */}
        {activeTab === 'admin' && isAdmin && (
          <div className="tab-content">
            <AdminPanel
              showToast={showToast}
              onListingsChanged={fetchListings}
            />
          </div>
        )}

        {/* ==================== SELLER DASHBOARD ==================== */}
        {activeTab === 'dashboard' && currentUser && (
          <div className="tab-content">
            <div className="dashboard-container">
              <h2 className="section-title">My Dashboard</h2>

              <div className="dashboard-section">
                <h3 className="dashboard-subtitle">
                  My Listings
                </h3>

                {sellerListings.length === 0 ? (
                  <p className="empty-text">
                    You have no listings yet.
                  </p>
                ) : (
                  <div className="listings-list">
                    {sellerListings.map((item) => {
                      const isSold =
                        item.is_sold === true ||
                        item.is_sold === 'true';

                      return (
                        <div
                          key={item.id}
                          className={`listing-item ${
                            isSold ? 'listing-item-sold' : ''
                          }`}
                        >
                          <div className="listing-item-info">
                            <strong>{item.title}</strong>

                            <span className="listing-item-price">
                              ZMW {item.price}
                            </span>

                            <span className="listing-item-stock">
                              Stock: {item.quantity}
                            </span>

                            {/* Listing status badge */}
                            <span
                              style={{
                                display: 'inline-block',
                                width: 'fit-content',
                                marginTop: '6px',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                backgroundColor: isSold
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(16, 185, 129, 0.15)',
                                color: isSold
                                  ? '#FCA5A5'
                                  : THEME.emerald,
                                border: `1px solid ${
                                  isSold
                                    ? 'rgba(239, 68, 68, 0.35)'
                                    : 'rgba(16, 185, 129, 0.35)'
                                }`,
                              }}
                            >
                              {isSold ? 'SOLD' : 'ACTIVE'}
                            </span>

                            {/* Five-day deletion notice */}
                            {isSold && item.sold_at && (
                              <span
                                style={{
                                  display: 'block',
                                  marginTop: '6px',
                                  color: THEME.textMuted,
                                  fontSize: '12px',
                                  lineHeight: '1.5',
                                }}
                              >
                                Scheduled for automatic deletion
                                {' '}5 days after it was marked as sold.
                              </span>
                            )}
                          </div>

                          <div className="listing-item-actions">
                            {editingId === item.id ? (
                              <div className="edit-form">
                                <input
                                  type="number"
                                  placeholder="Price"
                                  min="0"
                                  value={editForm.price}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      price: e.target.value,
                                    })
                                  }
                                  className="edit-input"
                                />

                                <input
                                  type="number"
                                  placeholder="Quantity"
                                  min="1"
                                  value={editForm.quantity}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      quantity: e.target.value,
                                    })
                                  }
                                  className="edit-input"
                                />

                                <button
                                  onClick={() =>
                                    handleUpdateListing(item.id)
                                  }
                                  className="save-btn"
                                >
                                  Save
                                </button>

                                <button
                                  onClick={() =>
                                    setEditingId(null)
                                  }
                                  className="cancel-btn"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                {/* Only active listings can be marked sold or edited. */}
                                {!isSold && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleMarkAsSold(item.id)
                                      }
                                      className="save-btn"
                                      style={{
                                        backgroundColor: '#059669',
                                        color: '#FFFFFF',
                                        border: '1px solid #059669',
                                      }}
                                      title="Mark this listing as sold"
                                    >
                                      ✓ Mark as Sold
                                    </button>

                                    <button
                                      onClick={() => {
                                        setEditingId(item.id);

                                        setEditForm({
                                          price: item.price,
                                          quantity: item.quantity,
                                        });
                                      }}
                                      className="edit-btn"
                                    >
                                      Edit
                                    </button>
                                  </>
                                )}

                                {/* Delete remains available for active and sold listings. */}
                                <button
                                  onClick={() =>
                                    handleDeleteListing(item.id)
                                  }
                                  className="delete-btn"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div> 
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
