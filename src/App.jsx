import React, { useState, useEffect } from 'react';

// Dynamic API Base URL for local development vs live Render production
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://unilnk-backend.onrender.com';

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

// UNILUS Theme Color Constants
const THEME = {
  unilusGreen: '#004D25',
  unilusDarkGreen: '#003318',
  emerald: '#10B981',
  emeraldHover: '#059669',
  goldAccent: '#F59E0B',
  bgDark: '#0B1320',
  cardBg: 'rgba(21, 34, 56, 0.75)',
  borderGreen: 'rgba(0, 102, 51, 0.6)',
  textMain: '#F8FAFC',
  textMuted: '#94A3B8',
};

function ListingCard({ item, onReserve }) {
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

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        border: `1px solid ${isHovered ? THEME.emerald : THEME.borderGreen}`,
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: THEME.cardBg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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

          {/* Campus Tag Badge */}
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

          <p style={{ margin: '8px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: THEME.emerald }}>
            ZMW {item.price}
          </p>
        </div>
      </div>

      <div style={{ padding: '0 15px 15px 15px' }}>
        <button
          onClick={() => onReserve(item.id)}
          disabled={item.quantity <= 0}
          style={{
            width: '100%',
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
          {item.quantity > 0 ? 'Reserve Item' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [listings, setListings] = useState([]);
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem('user')) || null
  );

  const [activeTab, setActiveTab] = useState('browse');
  const [toast, setToast] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [dashboardData, setDashboardData] = useState({ purchases: [], sales: [] });
  const [activeTxnId, setActiveTxnId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');

  const [sellerListings, setSellerListings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ price: '', quantity: '' });

  const [isRegister, setIsRegister] = useState(false);
  const [authData, setAuthData] = useState({ full_name: '', email: '', password: '', student_id: '' });
  
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

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    fetchListings();
    if (currentUser) {
      fetchDashboard();
      fetchSellerListings();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!activeTxnId) return;
    fetchMessages(activeTxnId);
    const interval = setInterval(() => {
      fetchMessages(activeTxnId);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTxnId]);

  const fetchListings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/listings`);
      const data = await res.json();
      if (data.success) setListings(data.data);
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    }
  };

  const fetchDashboard = async () => {
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
  };

  const fetchSellerListings = async () => {
    const userId = currentUser?.id || currentUser?.user?.id;
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/listings`);
      const data = await res.json();
      if (data.success) setSellerListings(data.listings);
    } catch (err) {
      console.error('Failed to load seller listings:', err);
    }
  };

  const fetchMessages = async (txnId) => {
    try {
      const res = await fetch(`${API_BASE}/api/transactions/${txnId}/messages`);
      const data = await res.json();
      if (data.success) setChatMessages(data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const openChat = (txnId) => {
    setActiveTxnId(txnId);
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

  const filteredListings = listings.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(term) ||
      (item.description && item.description.toLowerCase().includes(term));

    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
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
          showToast('Registration successful! Please sign in.');
          setIsRegister(false);
        } else {
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('token', data.token);
          setCurrentUser(data.user);
          showToast(`Welcome back, ${data.user.email}!`);
        }
      } else {
        showToast(data.error || 'Auth failed', 'error');
      }
    } catch (err) {
      showToast('Authentication failed. Server unreachable.', 'error');
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!currentUser) return showToast('Please log in first.', 'error');

    const sellerId = currentUser.id || currentUser.user?.id;
    if (!sellerId) {
      return showToast('Session issue. Please log out and sign back in.', 'error');
    }

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
    }
  };

  const handleReserve = async (listingId) => {
    if (!currentUser) {
      showToast('Please log in first to reserve items!', 'error');
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
        showToast(`Reserved! Transaction ID copied to clipboard.`, 'success');
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

  const getTabStyle = (tabName) => ({
    padding: '10px 20px',
    backgroundColor: activeTab === tabName ? THEME.unilusGreen : THEME.cardBg,
    color: activeTab === tabName ? '#ffffff' : THEME.textMuted,
    border: `1px solid ${activeTab === tabName ? THEME.emerald : THEME.borderGreen}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.2s ease',
  });

  return (
    <div style={{ backgroundColor: THEME.bgDark, minHeight: '100vh', color: THEME.textMain, padding: '24px 20px 20px 20px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* 1. Official UNILUS Top Brand Accent Bar */}
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
        
        {/* UNILUS Header Banner with Crest Emblem */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${THEME.unilusGreen}`, paddingBottom: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            
            {/* 2. UNILUS Crest Emblem Shield */}
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

        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              backgroundColor:
                toast.type === 'error'
                  ? '#DC2626'
                  : toast.type === 'info'
                  ? '#0284C7'
                  : THEME.unilusGreen,
              color: '#ffffff',
              border: `1px solid ${THEME.emerald}`,
              padding: '14px 22px',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            <span>{toast.message}</span>
          </div>
        )}

        {!currentUser ? (
          <div style={{ border: `1px solid ${THEME.borderGreen}`, padding: '24px', borderRadius: '12px', marginBottom: '20px', backgroundColor: THEME.cardBg, backdropFilter: 'blur(12px)' }}>
            <h2 style={{ color: THEME.emerald, marginTop: 0 }}>{isRegister ? 'Register Portal Account' : 'Student Sign In'}</h2>
            <form onSubmit={handleAuthSubmit}>
              {isRegister && (
                <>
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    style={{ display: 'block', width: '100%', marginBottom: '12px', padding: '10px', backgroundColor: '#0B1320', border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '4px' }}
                    onChange={(e) => setAuthData({ ...authData, full_name: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Student ID (e.g. UNILUS-2024-001)"
                    required
                    style={{ display: 'block', width: '100%', marginBottom: '12px', padding: '10px', backgroundColor: '#0B1320', border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '4px' }}
                    onChange={(e) => setAuthData({ ...authData, student_id: e.target.value })}
                  />
                </>
              )}
              <input
                type="email"
                placeholder="Student Email (@unilus.ac.zm)"
                required
                style={{ display: 'block', width: '100%', marginBottom: '12px', padding: '10px', backgroundColor: '#0B1320', border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '4px' }}
                onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                required
                style={{ display: 'block', width: '100%', marginBottom: '12px', padding: '10px', backgroundColor: '#0B1320', border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '4px' }}
                onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
              />
              <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: THEME.unilusGreen, color: '#fff', border: `1px solid ${THEME.emerald}`, cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px' }}>
                {isRegister ? 'Register Account' : 'Access Portal'}
              </button>
            </form>
            <p onClick={() => setIsRegister(!isRegister)} style={{ color: THEME.emerald, cursor: 'pointer', textAlign: 'center', marginTop: '14px', fontSize: '14px' }}>
              {isRegister ? 'Already registered? Login here' : "Need an account? Register here"}
            </p>
          </div>
        ) : (
          <div style={{ padding: '12px 18px', background: THEME.cardBg, backdropFilter: 'blur(12px)', border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Active Session: <strong style={{ color: THEME.emerald }}>{currentUser.email}</strong></span>
            <button onClick={() => { localStorage.clear(); setCurrentUser(null); setActiveTxnId(null); showToast('Logged out'); }} style={{ padding: '6px 14px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Log Out</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button style={getTabStyle('browse')} onClick={() => setActiveTab('browse')}>
            Browse Marketplace
          </button>
          {currentUser && (
            <>
              <button style={getTabStyle('sell')} onClick={() => setActiveTab('sell')}>
                + Sell Item
              </button>
              <button style={getTabStyle('verify')} onClick={() => setActiveTab('verify')}>
                Verify Handshake
              </button>
              <button style={getTabStyle('dashboard')} onClick={() => setActiveTab('dashboard')}>
                My Dashboard
              </button>
            </>
          )}
        </div>

        {activeTab === 'browse' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Search items by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, padding: '12px', fontSize: '14px', borderRadius: '6px', border: `1px solid ${THEME.borderGreen}`, backgroundColor: THEME.cardBg, color: '#fff', backdropFilter: 'blur(8px)' }}
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ padding: '12px', fontSize: '14px', borderRadius: '6px', border: `1px solid ${THEME.borderGreen}`, backgroundColor: THEME.cardBg, color: '#fff', backdropFilter: 'blur(8px)' }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '20px' }}>
              {filteredListings.length === 0 ? (
                <p style={{ color: THEME.textMuted, gridColumn: '1 / -1' }}>No listings found matching your criteria.</p>
              ) : (
                filteredListings.map((item) => (
                  <ListingCard key={item.id} item={item} onReserve={handleReserve} />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'sell' && (
          <div style={{ border: `1px solid ${THEME.borderGreen}`, padding: '24px', borderRadius: '12px', backgroundColor: THEME.cardBg, backdropFilter: 'blur(12px)' }}>
            <h3 style={{ marginTop: 0, color: THEME.emerald }}>Post New Item for Sale</h3>
            <form onSubmit={handleCreateListing}>
              <input
                type="text"
                placeholder="Title (e.g. Course Textbook, Calculator)"
                value={newListing.title}
                required
                style={{ display: 'block', width: '100%', marginBottom: '12px', padding: '10px', backgroundColor: '#0B1320', border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '4px' }}
                onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
              />
              <input
                type="text"
                placeholder="Description"
                value={newListing.description}
                style={{ display: 'block', width: '100%', marginBottom: '12px', padding: '10px', backgroundColor: '#0B1320', border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '4px' }}
                onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
              />
              
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: THEME.textMuted }}>
                Campus Location:
              </label>
              <select
                name="campus"
                value={newListing.campus}
                style={{ display: 'block', width: '100%', marginBottom: '12px', padding: '10px', backgroundColor: '#0B1320', border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '4px' }}
                onChange={(e) => setNewListing({ ...newListing, campus: e.target.value })}
              >
                {CAMPUSES.map((camp) => (
                  <option key={camp} value={camp}>{camp}</option>
                ))}
              </select>

              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: THEME.textMuted }}>
                Upload Photos (Select up to 5 images):
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'block', width: '100%', marginBottom: '12px', color: THEME.textMuted }}
                onChange={(e) => setImageFiles(Array.from(e.target.files))}
              />

              <input
                type="number"
                placeholder="Price (ZMW)"
                value={newListing.price}
                required
                style={{ display: 'block', width: '100%', marginBottom: '12px', padding: '10px', backgroundColor: '#0B1320', border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '4px' }}
                onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newListing.quantity}
                style={{ display: 'block', width: '100%', marginBottom: '12px', padding: '10px', backgroundColor: '#0B1320', border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '4px' }}
                onChange={(e) => setNewListing({ ...newListing, quantity: e.target.value })}
              />
              <select
                value={newListing.category}
                style={{ display: 'block', width: '100%', marginBottom: '16px', padding: '10px', backgroundColor: '#0B1320', border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '4px' }}
                onChange={(e) => setNewListing({ ...newListing, category: e.target.value })}
              >
                {CATEGORIES.filter(c => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button type="submit" style={{ padding: '12px 24px', backgroundColor: THEME.unilusGreen, color: 'white', border: `1px solid ${THEME.emerald}`, cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>
                Publish Listing
              </button>
            </form>
          </div>
        )}

        {activeTab === 'verify' && (
          <div style={{ border: `1px solid ${THEME.borderGreen}`, padding: '24px', borderRadius: '12px', backgroundColor: THEME.cardBg, backdropFilter: 'blur(12px)' }}>
            <h3 style={{ marginTop: 0, color: THEME.emerald }}>Handshake Verification</h3>
            <p style={{ color: THEME.textMuted, fontSize: '14px' }}>Enter the transaction UUID to complete an in-person exchange on campus.</p>
            <form onSubmit={handleHandshake}>
              <input
                type="text"
                placeholder="Transaction UUID..."
                value={handshakeTxnId}
                onChange={(e) => setHandshakeTxnId(e.target.value)}
                style={{ width: '65%', padding: '10px', marginRight: '10px', backgroundColor: '#0B1320', border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '4px' }}
                required
              />
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: THEME.unilusGreen, color: 'white', border: `1px solid ${THEME.emerald}`, borderRadius: '4px', fontWeight: 'bold' }}>Verify Handshake</button>
            </form>
          </div>
        )}

        {activeTab === 'dashboard' && currentUser && (
          <div style={{ border: `1px solid ${THEME.borderGreen}`, padding: '24px', borderRadius: '12px', backgroundColor: THEME.cardBg, backdropFilter: 'blur(12px)', color: '#fff' }}>
            <h2 style={{ color: THEME.emerald, marginTop: 0 }}>Student Dashboard</h2>

            <h3>My Active Listings</h3>
            {sellerListings.length === 0 ? (
              <p style={{ color: THEME.textMuted }}>You have no active listings.</p>
            ) : (
              <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                {sellerListings.map((item) => (
                  <div key={item.id} style={{ border: `1px solid ${THEME.borderGreen}`, padding: '12px', borderRadius: '6px', background: '#0B1320' }}>
                    <strong>{item.title}</strong> — ZMW {item.price} (Stock: {item.quantity})
                    <div style={{ marginTop: '8px' }}>
                      {editingId === item.id ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="number"
                            placeholder="Price"
                            value={editForm.price}
                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                            style={{ padding: '6px', backgroundColor: THEME.cardBg, color: '#fff', border: '1px solid #333' }}
                          />
                          <input
                            type="number"
                            placeholder="Quantity"
                            value={editForm.quantity}
                            onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                            style={{ padding: '6px', backgroundColor: THEME.cardBg, color: '#fff', border: '1px solid #333' }}
                          />
                          <button onClick={() => handleUpdateListing(item.id)} style={{ padding: '6px 12px', backgroundColor: THEME.unilusGreen, color: '#fff', border: 'none' }}>Save</button>
                          <button onClick={() => setEditingId(null)} style={{ padding: '6px 12px', backgroundColor: '#475569', color: '#fff', border: 'none' }}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              setEditForm({ price: item.price, quantity: item.quantity });
                            }}
                            style={{ marginRight: '8px', padding: '6px 12px', cursor: 'pointer', backgroundColor: THEME.unilusGreen, color: '#fff', border: 'none', borderRadius: '4px' }}
                          >
                            Edit Price/Stock
                          </button>
                          <button
                            onClick={() => handleDeleteListing(item.id)}
                            style={{ backgroundColor: '#DC2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
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

            <h3>My Reserved Purchases</h3>
            {dashboardData.purchases.length === 0 ? <p style={{ color: THEME.textMuted }}>No reserved items.</p> : (
              <ul>
                {dashboardData.purchases.map((p) => (
                  <li key={p.transaction_id} style={{ marginBottom: '12px' }}>
                    <strong>{p.title}</strong> (ZMW {p.total_price}) — Status: <span style={{ color: p.status === 'VERIFIED' ? THEME.emerald : '#F59E0B', fontWeight: 'bold' }}>{p.status}</span>
                    <br />
                    <button onClick={() => openChat(p.transaction_id)} style={{ marginTop: '6px', padding: '6px 12px', cursor: 'pointer', backgroundColor: THEME.unilusGreen, color: 'white', border: `1px solid ${THEME.emerald}`, borderRadius: '4px' }}>
                      Open Messenger
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {activeTxnId && (
              <div style={{ border: `1px solid ${THEME.borderGreen}`, padding: '16px', borderRadius: '8px', background: '#0B1320', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, color: THEME.emerald }}>Campus Chat ({activeTxnId.substring(0, 8)}...)</h4>
                  <span style={{ fontSize: '12px', color: THEME.emerald, fontWeight: 'bold' }}>● Live</span>
                </div>
                <div style={{ height: '160px', overflowY: 'auto', border: `1px solid ${THEME.borderGreen}`, padding: '10px', margin: '12px 0', background: THEME.cardBg, borderRadius: '4px' }}>
                  {chatMessages.length === 0 ? <p style={{ color: THEME.textMuted }}>No messages exchanged yet.</p> : (
                    chatMessages.map((m) => (
                      <div key={m.id} style={{ marginBottom: '8px' }}>
                        <strong style={{ color: THEME.emerald }}>{m.sender_name}:</strong> {m.message_text}
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendMessage} style={{ display: 'flex' }}>
                  <input
                    type="text"
                    placeholder="Type message..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    style={{ flex: 1, padding: '10px', marginRight: '8px', backgroundColor: THEME.bgDark, border: `1px solid ${THEME.borderGreen}`, color: '#fff', borderRadius: '4px' }}
                  />
                  <button type="submit" style={{ padding: '10px 20px', backgroundColor: THEME.unilusGreen, color: 'white', border: `1px solid ${THEME.emerald}`, borderRadius: '4px' }}>Send</button>
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