import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';

// Dynamic API Base URL
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://unilnk-backend-api.onrender.com';

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
  'Pioneer Campus',
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
};

// Toast Hook
const useToast = () => {
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);
  return { toast, showToast };
};

// Toast Component
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

// ============ LISTING CARD WITH CHAT BUTTON ============
const ListingCard = ({ item, onReserve, onOpenChat, currentUser }) => {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isReserving, setIsReserving] = useState(false);

  let images = [];
  try {
    if (item.image_url) {
      images = typeof item.image_url === 'string' && item.image_url.startsWith('[')
        ? JSON.parse(item.image_url)
        : [item.image_url];
    }
  } catch {
    images = [item.image_url];
  }

  const handleReserveClick = async () => {
    setIsReserving(true);
    await onReserve(item.id);
    setIsReserving(false);
  };

  const handleChatClick = () => {
    if (!currentUser) {
      onOpenChat(null, null, null, true); // Trigger login
      return;
    }
    onOpenChat(item.seller_id, item.id, item.title);
  };

  return (
    <div
      className={`listing-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        border: `1px solid ${isHovered ? THEME.emerald : THEME.borderGreen}`,
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: THEME.cardBg,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: isHovered ? '0 12px 24px rgba(0, 77, 37, 0.35)' : '0 4px 12px rgba(0, 0, 0, 0.4)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div>
        <div style={{ width: '100%', height: '180px', backgroundColor: '#090D16', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {images.length > 0 && images[activeImgIndex] ? (
            <img
              src={images[activeImgIndex]}
              alt={item.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span style={{ color: THEME.textMuted, fontSize: '13px' }}>No Image Available</span>
          )}

          <span style={{
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
          }}>
            📍 {item.campus || 'Silverest Main Campus'}
          </span>

          {images.length > 1 && (
            <>
              <button
                onClick={() => setActiveImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                style={{ position: 'absolute', left: '8px', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ‹
              </button>
              <button
                onClick={() => setActiveImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                style={{ position: 'absolute', right: '8px', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ›
              </button>
              <div style={{ position: 'absolute', bottom: '8px', display: 'flex', gap: '4px' }}>
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: idx === activeImgIndex ? THEME.emerald : 'rgba(255,255,255,0.5)',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: THEME.textMain, fontWeight: '600' }}>{item.title}</h3>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold',
                backgroundColor: item.quantity > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: item.quantity > 0 ? THEME.emerald : '#FCA5A5',
                border: `1px solid ${item.quantity > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {item.quantity > 0 ? `In Stock (${item.quantity})` : 'Sold Out'}
            </span>
          </div>

          {item.description && (
            <p style={{ margin: '0 0 10px 0', color: THEME.textMuted, fontSize: '13px', lineHeight: '1.4' }}>
              {item.description}
            </p>
          )}

          <p style={{ margin: '0 0 5px 0', color: THEME.textMuted, fontSize: '12px' }}>
            Category: <strong style={{ color: '#E2E8F0' }}>{item.category}</strong>
          </p>

          {/* SELLER INFO - NEW */}
          <p style={{ margin: '0 0 5px 0', color: THEME.textMuted, fontSize: '12px' }}>
            👤 Seller: <strong style={{ color: '#E2E8F0' }}>{item.seller_name || 'UNILUS Student'}</strong>
          </p>

          <p style={{ margin: '8px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: THEME.emerald }}>
            ZMW {item.price}
          </p>
        </div>
      </div>

      {/* ACTION BUTTONS - NEW LAYOUT WITH CHAT BUTTON */}
      <div style={{ padding: '0 15px 15px 15px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleReserveClick}
          disabled={item.quantity <= 0 || isReserving}
          style={{
            flex: 2,
            padding: '10px',
            backgroundColor: item.quantity > 0 ? THEME.unilusGreen : '#334155',
            color: 'white',
            border: `1px solid ${item.quantity > 0 ? THEME.emerald : '#475569'}`,
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: item.quantity > 0 ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s ease',
          }}
          onMouseOver={(e) => {
            if (item.quantity > 0) e.target.style.backgroundColor = THEME.unilusDarkGreen;
          }}
          onMouseOut={(e) => {
            if (item.quantity > 0) e.target.style.backgroundColor = THEME.unilusGreen;
          }}
        >
          {isReserving ? 'Processing...' : item.quantity > 0 ? 'Reserve Item' : 'Out of Stock'}
        </button>
        
        {/* CHAT BUTTON - NEW */}
        <button
          onClick={handleChatClick}
          disabled={!currentUser}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: 'transparent',
            color: currentUser ? THEME.goldAccent : THEME.textMuted,
            border: `1px solid ${currentUser ? THEME.goldAccent : '#475569'}`,
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: currentUser ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            minWidth: '100px',
          }}
          title={!currentUser ? 'Please login to chat' : 'Ask seller about this item'}
        >
          💬 Ask Seller
        </button>
      </div>
    </div>
  );
};

// ============ CHAT MODAL ============
const ChatModal = ({ isOpen, onClose, sellerId, listingId, listingTitle, currentUser, API_BASE }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && sellerId && currentUser) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, sellerId, currentUser]);

  const fetchMessages = async () => {
    try {
      const userId = currentUser?.id || currentUser?.user?.id;
      const res = await fetch(`${API_BASE}/api/chat/${userId}/${sellerId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    setIsLoading(true);
    try {
      const userId = currentUser?.id || currentUser?.user?.id;
      const res = await fetch(`${API_BASE}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: userId,
          receiver_id: sellerId,
          listing_id: listingId,
          message: newMessage.trim()
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        fetchMessages();
      } else {
        showToast('Failed to send message', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: THEME.bgDark,
        border: `1px solid ${THEME.borderGreen}`,
        borderRadius: '16px',
        maxWidth: '500px',
        width: '95%',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Chat Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${THEME.borderGreen}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          background: THEME.cardBg,
          flexShrink: 0,
        }}>
          <div>
            <h3 style={{ margin: 0, color: THEME.emerald, fontSize: '18px' }}>💬 Chat with Seller</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: THEME.textMuted }}>About: {listingTitle || 'Item'}</p>
          </div>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: THEME.textMuted,
            fontSize: '28px',
            cursor: 'pointer',
          }}>×</button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          minHeight: '300px',
          maxHeight: '400px',
          background: 'rgba(11, 19, 32, 0.3)',
        }}>
          {messages.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: THEME.textMuted,
              gap: '12px',
            }}>
              <span style={{ fontSize: '48px' }}>💬</span>
              <p style={{ fontSize: '14px', margin: 0 }}>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const userId = currentUser?.id || currentUser?.user?.id;
              const isSent = msg.sender_id === userId;
              return (
                <div 
                  key={index} 
                  style={{
                    marginBottom: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    maxWidth: '85%',
                    wordWrap: 'break-word',
                    background: isSent ? THEME.unilusGreen : 'rgba(255, 255, 255, 0.06)',
                    marginLeft: isSent ? 'auto' : '0',
                    borderBottomRightRadius: isSent ? '4px' : '10px',
                    borderBottomLeftRadius: isSent ? '10px' : '4px',
                    color: isSent ? '#fff' : THEME.textMain,
                  }}
                >
                  <span style={{ fontWeight: 'bold', color: isSent ? THEME.goldLight : THEME.emerald, marginRight: '6px', fontSize: '13px' }}>
                    {msg.sender_name || 'Student'}:
                  </span>
                  <span style={{ fontSize: '14px', lineHeight: '1.4' }}>{msg.message}</span>
                  <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '8px', display: 'inline-block' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} style={{
          padding: '16px 24px',
          borderTop: `1px solid ${THEME.borderGreen}`,
          display: 'flex',
          gap: '12px',
          background: THEME.bgDark,
          flexShrink: 0,
        }}>
          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: THEME.bgDark,
              border: `1px solid ${THEME.borderGreen}`,
              color: '#fff',
              borderRadius: '6px',
              fontSize: '14px',
            }}
            disabled={isLoading}
          />
          <button type="submit" style={{
            padding: '12px 24px',
            background: THEME.unilusGreen,
            color: 'white',
            border: `1px solid ${THEME.emerald}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============ AUTH MODAL ============
const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [authData, setAuthData] = useState({ full_name: '', email: '', password: '', student_id: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      });
      const data = await res.json();
      
      if (data.success) {
        if (isRegister) {
          showToast('Registration successful! Please sign in.', 'success');
          setIsRegister(false);
        } else {
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('token', data.token);
          onAuthSuccess(data.user);
          showToast(`Welcome, ${data.user.full_name || data.user.email}!`, 'success');
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: THEME.bgDark,
        border: `1px solid ${THEME.borderGreen}`,
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '440px',
        width: '90%',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: 'absolute',
          top: '12px',
          right: '16px',
          background: 'none',
          border: 'none',
          color: THEME.textMuted',
          fontSize: '28px',
          cursor: 'pointer',
        }}>×</button>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: THEME.unilusGreen,
            border: `2px solid ${THEME.goldAccent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: THEME.goldAccent,
            fontWeight: '900',
            fontSize: '24px',
            margin: '0 auto 16px',
          }}>U</div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '22px' }}>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
          <p style={{ color: THEME.textMuted, fontSize: '14px' }}>{isRegister ? 'Join the UNILUS student marketplace' : 'Sign in to your student account'}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isRegister && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                required
                style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${THEME.borderGreen}`, borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                value={authData.full_name}
                onChange={(e) => setAuthData({ ...authData, full_name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Student ID (e.g. UNILUS-2024-001)"
                required
                style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${THEME.borderGreen}`, borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                value={authData.student_id}
                onChange={(e) => setAuthData({ ...authData, student_id: e.target.value })}
              />
            </>
          )}
          <input
            type="email"
            placeholder="Student Email (@unilus.ac.zm)"
            required
            style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${THEME.borderGreen}`, borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            value={authData.email}
            onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            required
            style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${THEME.borderGreen}`, borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            value={authData.password}
            onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
          />
          <button type="submit" disabled={isLoading} style={{
            padding: '14px',
            background: THEME.unilusGreen,
            color: '#fff',
            border: `1px solid ${THEME.emerald}`,
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer',
          }}>
            {isLoading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p onClick={() => setIsRegister(!isRegister)} style={{
          textAlign: 'center',
          marginTop: '16px',
          color: THEME.emerald,
          cursor: 'pointer',
          fontSize: '14px',
        }}>
          {isRegister ? 'Already have an account? Sign in' : "Need an account? Sign up"}
        </p>
      </div>
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
    listingTitle: ''
  });
  
  const { toast, showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCampus, setSelectedCampus] = useState('All');

  const [dashboardData, setDashboardData] = useState({ purchases: [], sales: [] });
  const [activeTxnId, setActiveTxnId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');

  const [sellerListings, setSellerListings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ price: '', quantity: '' });

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
  const [handshakeTxnId, setHandshakeTxnId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch listings
  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/listings`);
      const data = await res.json();
      if (data.success) setListings(data.data);
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    const userId = currentUser?.id || currentUser?.user?.id;
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/dashboard`);
      const data = await res.json();
      if (data.success) {
        setDashboardData({ purchases: data.purchases, sales: data.sales });
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  }, [currentUser]);

  const fetchSellerListings = useCallback(async () => {
    const userId = currentUser?.id || currentUser?.user?.id;
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/listings`);
      const data = await res.json();
      if (data.success) setSellerListings(data.listings);
    } catch (err) {
      console.error('Failed to load seller listings:', err);
    }
  }, [currentUser]);

  const fetchMessages = useCallback(async (txnId) => {
    try {
      const res = await fetch(`${API_BASE}/api/transactions/${txnId}/messages`);
      const data = await res.json();
      if (data.success) setChatMessages(data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (currentUser) {
      fetchDashboard();
      fetchSellerListings();
    }
  }, [currentUser, fetchDashboard, fetchSellerListings]);

  useEffect(() => {
    if (!activeTxnId) return;
    fetchMessages(activeTxnId);
    const interval = setInterval(() => fetchMessages(activeTxnId), 3000);
    return () => clearInterval(interval);
  }, [activeTxnId, fetchMessages]);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.clear();
    setCurrentUser(null);
    setActiveTxnId(null);
    showToast('Logged out successfully', 'info');
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/listings/${listingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Listing removed successfully.', 'info');
        fetchSellerListings();
        fetchListings();
      }
    } catch (err) {
      showToast('Failed to delete listing', 'error');
    }
  };

  const handleUpdateListing = async (listingId) => {
    try {
      const res = await fetch(`${API_BASE}/api/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Listing updated successfully!');
        setEditingId(null);
        fetchSellerListings();
        fetchListings();
      }
    } catch (err) {
      showToast('Failed to update listing', 'error');
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = item.title.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term));
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesCampus = selectedCampus === 'All' || item.campus === selectedCampus;
      return matchesSearch && matchesCategory && matchesCampus;
    });
  }, [listings, searchTerm, selectedCategory, selectedCampus]);

  // Open chat with seller
  const handleOpenChat = (sellerId, listingId, listingTitle, requireLogin = false) => {
    if (requireLogin || !currentUser) {
      setIsAuthModalOpen(true);
      showToast('Please login to chat with sellers', 'info');
      return;
    }
    
    if (!sellerId) {
      showToast('Seller information not available', 'error');
      return;
    }

    setChatModal({
      isOpen: true,
      sellerId: sellerId,
      listingId: listingId,
      listingTitle: listingTitle || 'Item'
    });
  };

  const handleCloseChat = () => {
    setChatModal({
      isOpen: false,
      sellerId: null,
      listingId: null,
      listingTitle: ''
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeTxnId) return;

    const userId = currentUser?.id || currentUser?.user?.id;

    try {
      const res = await fetch(`${API_BASE}/api/transactions/${activeTxnId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: userId, message_text: newMessageText }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessageText('');
        fetchMessages(activeTxnId);
      }
    } catch (err) {
      showToast('Failed to send message', 'error');
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please log in first.', 'error');
      return;
    }

    const sellerId = currentUser.id || currentUser.user?.id;
    if (!sellerId) {
      showToast('Session issue. Please log out and sign back in.', 'error');
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
      const res = await fetch(`${API_BASE}/api/listings`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        showToast('Listing created successfully!');
        setNewListing(initialListingState);
        setImageFiles([]);
        fetchListings();
        fetchDashboard();
        fetchSellerListings();
        setActiveTab('browse');
      } else {
        showToast(data.error || 'Failed to create listing', 'error');
      }
    } catch (err) {
      showToast('Failed to create listing', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReserve = async (listingId) => {
    if (!currentUser) {
      showToast('Please log in first to reserve items!', 'error');
      setIsAuthModalOpen(true);
      return;
    }

    const userId = currentUser.id || currentUser.user?.id;

    try {
      const res = await fetch(`${API_BASE}/api/transactions/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          buyer_id: userId,
          quantity: 1,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Reserved! Transaction ID: ${data.transaction.id.substring(0, 8)}...`, 'success');
        navigator.clipboard.writeText(data.transaction.id);
        fetchListings();
        fetchDashboard();
      } else {
        showToast(`Reservation failed: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast('Failed to connect to backend server.', 'error');
    }
  };

  const handleHandshake = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/transactions/handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: handshakeTxnId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Transaction verified successfully!', 'success');
        setHandshakeTxnId('');
        fetchDashboard();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Verification failed.', 'error');
    }
  };

  const TabButton = ({ tab, label, icon }) => (
    <button
      style={{
        padding: '10px 20px',
        backgroundColor: activeTab === tab ? THEME.unilusGreen : THEME.cardBg,
        color: activeTab === tab ? '#ffffff' : THEME.textMuted,
        border: `1px solid ${activeTab === tab ? THEME.emerald : THEME.borderGreen}`,
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.2s ease',
      }}
      onClick={() => setActiveTab(tab)}
    >
      {icon && <span style={{ marginRight: '6px' }}>{icon}</span>}
      {label}
    </button>
  );

  return (
    <div style={{ backgroundColor: THEME.bgDark, minHeight: '100vh', color: THEME.textMain, padding: '24px 20px 20px 20px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* Top Brand Accent Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: `linear-gradient(90deg, ${THEME.unilusGreen} 0%, ${THEME.goldAccent} 50%, ${THEME.unilusGreen} 100%)`,
        zIndex: 9999,
      }} />

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${THEME.unilusGreen}`, paddingBottom: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              backgroundColor: THEME.unilusGreen,
              border: `2px solid ${THEME.goldAccent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: THEME.goldAccent,
              fontWeight: '900',
              fontSize: '20px',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.25)'
            }}>
              U
            </div>
            <div>
              <h1 style={{ margin: 0, color: '#ffffff', fontSize: '26px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                UniLnk <span style={{ color: THEME.emerald, fontSize: '18px', fontWeight: 'normal' }}>| UNILUS Student Portal</span>
              </h1>
              <p style={{ margin: '4px 0 0 0', color: THEME.textMuted, fontSize: '13px' }}>
                University of Lusaka Student Marketplace & Services
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: THEME.emerald, boxShadow: `0 0 10px ${THEME.emerald}` }}></div>
            <span style={{ fontSize: '12px', color: THEME.textMuted, fontWeight: 'bold' }}>Campus Network</span>
          </div>
        </div>

        <Toast toast={toast} />

        {/* Auth / User Session */}
        {!currentUser ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', padding: '16px', background: THEME.cardBg, backdropFilter: 'blur(12px)', border: `1px solid ${THEME.borderGreen}`, borderRadius: '12px', marginBottom: '20px' }}>
            <button onClick={() => setIsAuthModalOpen(true)} style={{ padding: '10px 24px', background: THEME.unilusGreen, color: '#fff', border: `1px solid ${THEME.emerald}`, borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
              Student Sign In
            </button>
            <span style={{ color: THEME.textMuted, fontSize: '14px' }}>or</span>
            <button onClick={() => setIsAuthModalOpen(true)} style={{ padding: '10px 24px', background: 'transparent', color: '#fff', border: `1px solid ${THEME.textMuted}`, borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
              Create Account
            </button>
          </div>
        ) : (
          <div style={{ padding: '12px 18px', background: THEME.cardBg, backdropFilter: 'blur(12px)', border: `1px solid ${THEME.borderGreen}`, borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Active Session: <strong style={{ color: THEME.emerald }}>{currentUser.full_name || currentUser.email}</strong></span>
            <button onClick={handleLogout} style={{ padding: '6px 14px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Log Out</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <TabButton tab="browse" label="Browse Marketplace" icon="🛍️" />
          {currentUser && (
            <>
              <TabButton tab="sell" label="Sell Item" icon="➕" />
              <TabButton tab="verify" label="Verify Handshake" icon="🤝" />
              <TabButton tab="dashboard" label="My Dashboard" icon="📊" />
            </>
          )}
        </div>

        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* Chat Modal */}
        <ChatModal
          isOpen={chatModal.isOpen}
          onClose={handleCloseChat}
          sellerId={chatModal.sellerId}
          listingId={chatModal.listingId}
          listingTitle={chatModal.listingTitle}
          currentUser={currentUser}
          API_BASE={API_BASE}
        />

        {/* Tab Content */}
        {activeTab === 'browse' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search items by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '12px 16px', fontSize: '14px', borderRadius: '8px', border: `1px solid ${THEME.borderGreen}`, backgroundColor: THEME.cardBg, color: '#fff', backdropFilter: 'blur(8px)' }}
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ padding: '12px 16px', fontSize: '14px', borderRadius: '8px', border: `1px solid ${THEME.borderGreen}`, backgroundColor: THEME.cardBg, color: '#fff', backdropFilter: 'blur(8px)', minWidth: '150px' }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                style={{ padding: '12px 16px', fontSize: '14px', borderRadius: '8px', border: `1px solid ${THEME.borderGreen}`, backgroundColor: THEME.cardBg, color: '#fff', backdropFilter: 'blur(8px)', minWidth: '150px' }}
              >
                <option value="All">All Campuses</option>
                {CAMPUSES.map((camp) => (
                  <option key={camp} value={camp}>{camp}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
              {filteredListings.length === 0 ? (
                <p style={{ color: THEME.textMuted, gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0' }}>No listings found matching your criteria.</p>
              ) : (
                filteredListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    item={item}
                    onReserve={handleReserve}
                    onOpenChat={handleOpenChat}
                    currentUser={currentUser}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'sell' && (
          <div style={{ border: `1px solid ${THEME.borderGreen}`, padding: '28px', borderRadius: '14px', backgroundColor: THEME.cardBg, backdropFilter: 'blur(12px)' }}>
            <h2 style={{ marginTop: 0, color: THEME.emerald }}>Post New Item for Sale</h2>
            <form onSubmit={handleCreateListing} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text"
                placeholder="Title (e.g. Course Textbook, Calculator)"
                value={newListing.title}
                required
                style={{ padding: '12px 16px', background: THEME.bgDark, border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '8px', fontSize: '14px' }}
                onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
              />
              <textarea
                placeholder="Description"
                value={newListing.description}
                style={{ padding: '12px 16px', background: THEME.bgDark, border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '8px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', minHeight: '80px' }}
                onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                rows="3"
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: THEME.textMuted, fontWeight: '500' }}>Campus Location</label>
                  <select
                    value={newListing.campus}
                    style={{ padding: '12px 16px', background: THEME.bgDark, border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '8px', fontSize: '14px' }}
                    onChange={(e) => setNewListing({ ...newListing, campus: e.target.value })}
                  >
                    {CAMPUSES.map((camp) => (
                      <option key={camp} value={camp}>{camp}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: THEME.textMuted, fontWeight: '500' }}>Category</label>
                  <select
                    value={newListing.category}
                    style={{ padding: '12px 16px', background: THEME.bgDark, border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '8px', fontSize: '14px' }}
                    onChange={(e) => setNewListing({ ...newListing, category: e.target.value })}
                  >
                    {CATEGORIES.filter(c => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: THEME.textMuted, fontWeight: '500' }}>Price (ZMW)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newListing.price}
                    required
                    style={{ padding: '12px 16px', background: THEME.bgDark, border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '8px', fontSize: '14px' }}
                    onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', color: THEME.textMuted, fontWeight: '500' }}>Quantity</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={newListing.quantity}
                    style={{ padding: '12px 16px', background: THEME.bgDark, border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '8px', fontSize: '14px' }}
                    onChange={(e) => setNewListing({ ...newListing, quantity: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: THEME.textMuted, fontWeight: '500' }}>Upload Photos (Select up to 5 images)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ padding: '12px', background: THEME.bgDark, border: `1px solid ${THEME.borderGreen}`, color: THEME.textMuted, borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                  onChange={(e) => setImageFiles(Array.from(e.target.files))}
                />
                {imageFiles.length > 0 && (
                  <p style={{ fontSize: '13px', color: THEME.textMuted, margin: '4px 0 0 0' }}>{imageFiles.length} image(s) selected</p>
                )}
              </div>

              <button type="submit" disabled={isLoading} style={{
                padding: '14px',
                background: THEME.unilusGreen,
                color: 'white',
                border: `1px solid ${THEME.emerald}`,
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}>
                {isLoading ? 'Publishing...' : 'Publish Listing'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'verify' && (
          <div style={{ border: `1px solid ${THEME.borderGreen}`, padding: '28px', borderRadius: '14px', backgroundColor: THEME.cardBg, backdropFilter: 'blur(12px)' }}>
            <h2 style={{ marginTop: 0, color: THEME.emerald }}>Handshake Verification</h2>
            <p style={{ color: THEME.textMuted, fontSize: '14px', marginBottom: '20px' }}>Enter the transaction UUID to complete an in-person exchange on campus.</p>
            <form onSubmit={handleHandshake} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Transaction UUID..."
                value={handshakeTxnId}
                onChange={(e) => setHandshakeTxnId(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '12px 16px', background: THEME.bgDark, border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '8px', fontSize: '14px' }}
                required
              />
              <button type="submit" style={{ padding: '12px 24px', background: THEME.unilusGreen, color: 'white', border: `1px solid ${THEME.emerald}`, borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Verify Handshake</button>
            </form>
          </div>
        )}

        {activeTab === 'dashboard' && currentUser && (
          <div style={{ border: `1px solid ${THEME.borderGreen}`, padding: '28px', borderRadius: '14px', backgroundColor: THEME.cardBg, backdropFilter: 'blur(12px)' }}>
            <h2 style={{ color: THEME.emerald, marginTop: 0 }}>Student Dashboard</h2>

            <div style={{ marginTop: '24px' }}>
              <h3 style={{ color: THEME.textLight, fontSize: '18px', margin: '0 0 12px 0' }}>My Active Listings</h3>
              {sellerListings.length === 0 ? (
                <p style={{ color: THEME.textMuted }}>You have no active listings.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sellerListings.map((item) => (
                    <div key={item.id} style={{ border: `1px solid ${THEME.borderGreen}`, padding: '16px', borderRadius: '8px', background: THEME.bgDark, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <strong>{item.title}</strong>
                        <span style={{ color: THEME.emerald, fontWeight: 'bold' }}>ZMW {item.price}</span>
                        <span style={{ color: THEME.textMuted, fontSize: '13px' }}>Stock: {item.quantity}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {editingId === item.id ? (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <input
                              type="number"
                              placeholder="Price"
                              value={editForm.price}
                              onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                              style={{ padding: '6px 12px', background: THEME.cardBg, color: '#fff', border: `1px solid ${THEME.borderGreen}`, borderRadius: '4px', width: '80px', fontSize: '13px' }}
                            />
                            <input
                              type="number"
                              placeholder="Quantity"
                              value={editForm.quantity}
                              onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                              style={{ padding: '6px 12px', background: THEME.cardBg, color: '#fff', border: `1px solid ${THEME.borderGreen}`, borderRadius: '4px', width: '80px', fontSize: '13px' }}
                            />
                            <button onClick={() => handleUpdateListing(item.id)} style={{ padding: '6px 16px', background: THEME.success, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Save</button>
                            <button onClick={() => setEditingId(null)} style={{ padding: '6px 16px', background: '#475569', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(item.id);
                                setEditForm({ price: item.price, quantity: item.quantity });
                              }}
                              style={{ padding: '6px 16px', background: THEME.unilusGreen, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteListing(item.id)}
                              style={{ padding: '6px 16px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px' }}>
              <h3 style={{ color: THEME.textLight, fontSize: '18px', margin: '0 0 12px 0' }}>My Reserved Purchases</h3>
              {dashboardData.purchases.length === 0 ? (
                <p style={{ color: THEME.textMuted }}>No reserved items.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dashboardData.purchases.map((p) => (
                    <div key={p.transaction_id} style={{ border: `1px solid ${THEME.borderGreen}`, padding: '16px', borderRadius: '8px', background: THEME.bgDark, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <strong>{p.title}</strong>
                        <span>ZMW {p.total_price}</span>
                        <span style={{
                          padding: '3px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          background: p.status === 'VERIFIED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: p.status === 'VERIFIED' ? THEME.emerald : THEME.warning,
                        }}>
                          {p.status}
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTxnId(p.transaction_id)}
                        style={{ padding: '8px 16px', background: THEME.unilusGreen, color: 'white', border: `1px solid ${THEME.emerald}`, borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                      >
                        💬 Open Messenger
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeTxnId && (
              <div style={{ border: `1px solid ${THEME.borderGreen}`, padding: '20px', borderRadius: '10px', background: THEME.bgDark, marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, color: THEME.emerald, fontSize: '16px' }}>💬 Campus Chat ({activeTxnId.substring(0, 8)}...)</h4>
                  <span style={{ fontSize: '12px', color: THEME.emerald, fontWeight: 'bold' }}>● Live</span>
                </div>
                <div style={{ height: '200px', overflowY: 'auto', border: `1px solid ${THEME.borderGreen}`, padding: '12px', background: THEME.cardBg, borderRadius: '6px', marginBottom: '12px' }}>
                  {chatMessages.length === 0 ? (
                    <p style={{ color: THEME.textMuted }}>No messages exchanged yet.</p>
                  ) : (
                    chatMessages.map((m) => (
                      <div key={m.id} style={{
                        marginBottom: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        maxWidth: '80%',
                        background: m.sender_id === (currentUser?.id || currentUser?.user?.id) ? THEME.unilusGreen : 'rgba(255, 255, 255, 0.05)',
                        marginLeft: m.sender_id === (currentUser?.id || currentUser?.user?.id) ? 'auto' : '0',
                        color: m.sender_id === (currentUser?.id || currentUser?.user?.id) ? '#fff' : THEME.textMain,
                      }}>
                        <span style={{ fontWeight: 'bold', color: m.sender_id === (currentUser?.id || currentUser?.user?.id) ? THEME.goldLight : THEME.emerald, marginRight: '6px' }}>{m.sender_name}:</span>
                        <span style={{ wordWrap: 'break-word' }}>{m.message_text}</span>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Type message..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    style={{ flex: 1, padding: '12px 16px', background: THEME.bgDark, border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <button type="submit" style={{ padding: '12px 24px', background: THEME.unilusGreen, color: 'white', border: `1px solid ${THEME.emerald}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Send</button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
