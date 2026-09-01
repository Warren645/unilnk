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

// Enhanced Theme
const THEME = {
  unilusGreen: '#004D25',
  unilusDarkGreen: '#003318',
  unilusLightGreen: '#1a7a4a',
  emerald: '#10B981',
  emeraldHover: '#059669',
  goldAccent: '#F59E0B',
  goldLight: '#FCD34D',
  bgDark: '#0B1320',
  bgCard: 'rgba(21, 34, 56, 0.85)',
  borderGreen: 'rgba(0, 102, 51, 0.4)',
  textMain: '#F8FAFC',
  textMuted: '#94A3B8',
  textLight: '#E2E8F0',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
};

// Custom Hook for Toast Notifications
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
  
  const colors = {
    success: THEME.unilusGreen,
    error: THEME.danger,
    warning: THEME.warning,
    info: '#0284C7',
  };

  return (
    <div className="toast-container">
      <div className={`toast toast-${toast.type}`}>
        <span className="toast-icon">
          {toast.type === 'success' && '✓'}
          {toast.type === 'error' && '✕'}
          {toast.type === 'warning' && '⚠'}
          {toast.type === 'info' && 'ℹ'}
        </span>
        <span>{toast.message}</span>
      </div>
    </div>
  );
};

// Enhanced Listing Card Component
const ListingCard = ({ item, onReserve, currentUser }) => {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isReserving, setIsReserving] = useState(false);

  const images = useMemo(() => {
    try {
      if (item.image_url) {
        return typeof item.image_url === 'string' && item.image_url.startsWith('[')
          ? JSON.parse(item.image_url)
          : [item.image_url];
      }
      return [];
    } catch {
      return [item.image_url];
    }
  }, [item.image_url]);

  const handleReserveClick = async () => {
    setIsReserving(true);
    await onReserve(item.id);
    setIsReserving(false);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <div
      className={`listing-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="listing-image-container">
        {images.length > 0 && images[activeImgIndex] ? (
          <img
            src={images[activeImgIndex]}
            alt={item.title}
            className="listing-image"
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="no-image-placeholder">
            <span>📷</span>
            <span>No Image</span>
          </div>
        )}

        <span className="campus-badge">
          📍 {item.campus || 'Silverest Main Campus'}
        </span>

        {images.length > 1 && (
          <>
            <button onClick={prevImage} className="image-nav-btn left">
              ‹
            </button>
            <button onClick={nextImage} className="image-nav-btn right">
              ›
            </button>
            <div className="image-dots">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`dot ${idx === activeImgIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="listing-content">
        <div className="listing-header">
          <h3 className="listing-title">{item.title}</h3>
          <span className={`stock-badge ${item.quantity > 0 ? 'in-stock' : 'out-of-stock'}`}>
            {item.quantity > 0 ? `In Stock (${item.quantity})` : 'Sold Out'}
          </span>
        </div>

        {item.description && (
          <p className="listing-description">{item.description}</p>
        )}

        <div className="listing-meta">
          <span>Category: <strong>{item.category}</strong></span>
          <span className="listing-price">ZMW {item.price}</span>
        </div>
      </div>

      <div className="listing-actions">
        <button
          onClick={handleReserveClick}
          disabled={item.quantity <= 0 || isReserving}
          className={`reserve-btn ${item.quantity > 0 ? 'available' : 'unavailable'}`}
        >
          {isReserving ? 'Processing...' : item.quantity > 0 ? 'Reserve Item' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
};

// Auth Modal Component
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="auth-header">
          <div className="auth-logo">U</div>
          <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
          <p>{isRegister ? 'Join the UNILUS student marketplace' : 'Sign in to your student account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                required
                value={authData.full_name}
                onChange={(e) => setAuthData({ ...authData, full_name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Student ID (e.g. UNILUS-2024-001)"
                required
                value={authData.student_id}
                onChange={(e) => setAuthData({ ...authData, student_id: e.target.value })}
              />
            </>
          )}
          <input
            type="email"
            placeholder="Student Email (@unilus.ac.zm)"
            required
            value={authData.email}
            onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={authData.password}
            onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
          />
          <button type="submit" disabled={isLoading} className="auth-submit-btn">
            {isLoading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="auth-toggle" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account? Sign in' : "Need an account? Sign up"}
        </p>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [listings, setListings] = useState([]);
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem('user')) || null
  );
  const [activeTab, setActiveTab] = useState('browse');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
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

  // Fetch dashboard data
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

  // Fetch seller listings
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

  // Fetch messages
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
      className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
      onClick={() => setActiveTab(tab)}
    >
      {icon && <span className="tab-icon">{icon}</span>}
      {label}
    </button>
  );

  return (
    <div className="app-container">
      {/* Top Brand Accent Bar */}
      <div className="accent-bar" />

      <div className="app-content">
        {/* Header */}
        <header className="app-header">
          <div className="header-left">
            <div className="unilus-crest">U</div>
            <div>
              <h1 className="header-title">
                UniLnk <span className="header-subtitle">| UNILUS Student Portal</span>
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

        {/* User Session */}
        {!currentUser ? (
          <div className="auth-prompt">
            <button className="auth-prompt-btn" onClick={() => setIsAuthModalOpen(true)}>
              Student Sign In
            </button>
            <span className="auth-prompt-text">or</span>
            <button className="auth-prompt-btn secondary" onClick={() => {
              setIsAuthModalOpen(true);
            }}>
              Create Account
            </button>
          </div>
        ) : (
          <div className="user-session">
            <span className="session-text">
              Active Session: <strong>{currentUser.full_name || currentUser.email}</strong>
            </span>
            <button className="logout-btn" onClick={handleLogout}>
              Log Out
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="tab-nav">
          <TabButton tab="browse" label="Browse Marketplace" icon="🛍️" />
          {currentUser && (
            <>
              <TabButton tab="sell" label="Sell Item" icon="➕" />
              <TabButton tab="verify" label="Verify Handshake" icon="🤝" />
              <TabButton tab="dashboard" label="My Dashboard" icon="📊" />
            </>
          )}
        </nav>

        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* Tab Content */}
        {activeTab === 'browse' && (
          <div className="tab-content">
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
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="filter-select"
              >
                <option value="All">All Campuses</option>
                {CAMPUSES.map((camp) => (
                  <option key={camp} value={camp}>{camp}</option>
                ))}
              </select>
            </div>

            <div className="listings-grid">
              {filteredListings.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🔍</span>
                  <p>No listings found matching your criteria.</p>
                </div>
              ) : (
                filteredListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    item={item}
                    onReserve={handleReserve}
                    currentUser={currentUser}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'sell' && (
          <div className="tab-content">
            <div className="sell-form-container">
              <h2 className="section-title">Post New Item for Sale</h2>
              <form onSubmit={handleCreateListing} className="sell-form">
                <input
                  type="text"
                  placeholder="Title (e.g. Course Textbook, Calculator)"
                  value={newListing.title}
                  required
                  onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                  className="form-input"
                />
                <textarea
                  placeholder="Description"
                  value={newListing.description}
                  onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                  className="form-textarea"
                  rows="3"
                />
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Campus Location</label>
                    <select
                      value={newListing.campus}
                      onChange={(e) => setNewListing({ ...newListing, campus: e.target.value })}
                      className="form-select"
                    >
                      {CAMPUSES.map((camp) => (
                        <option key={camp} value={camp}>{camp}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={newListing.category}
                      onChange={(e) => setNewListing({ ...newListing, category: e.target.value })}
                      className="form-select"
                    >
                      {CATEGORIES.filter(c => c !== 'All').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
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
                      onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      placeholder="1"
                      value={newListing.quantity}
                      onChange={(e) => setNewListing({ ...newListing, quantity: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Upload Photos (Select up to 5 images)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setImageFiles(Array.from(e.target.files))}
                    className="form-file-input"
                  />
                  {imageFiles.length > 0 && (
                    <p className="file-count">{imageFiles.length} image(s) selected</p>
                  )}
                </div>

                <button type="submit" disabled={isLoading} className="submit-btn">
                  {isLoading ? 'Publishing...' : 'Publish Listing'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'verify' && (
          <div className="tab-content">
            <div className="verify-container">
              <h2 className="section-title">Handshake Verification</h2>
              <p className="verify-description">
                Enter the transaction UUID to complete an in-person exchange on campus.
              </p>
              <form onSubmit={handleHandshake} className="verify-form">
                <input
                  type="text"
                  placeholder="Transaction UUID..."
                  value={handshakeTxnId}
                  onChange={(e) => setHandshakeTxnId(e.target.value)}
                  className="verify-input"
                  required
                />
                <button type="submit" className="verify-btn">
                  Verify Handshake
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && currentUser && (
          <div className="tab-content">
            <div className="dashboard-container">
              <h2 className="section-title">Student Dashboard</h2>

              <div className="dashboard-section">
                <h3 className="dashboard-subtitle">My Active Listings</h3>
                {sellerListings.length === 0 ? (
                  <p className="empty-text">You have no active listings.</p>
                ) : (
                  <div className="listings-list">
                    {sellerListings.map((item) => (
                      <div key={item.id} className="listing-item">
                        <div className="listing-item-info">
                          <strong>{item.title}</strong>
                          <span className="listing-item-price">ZMW {item.price}</span>
                          <span className="listing-item-stock">Stock: {item.quantity}</span>
                        </div>
                        <div className="listing-item-actions">
                          {editingId === item.id ? (
                            <div className="edit-form">
                              <input
                                type="number"
                                placeholder="Price"
                                value={editForm.price}
                                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                className="edit-input"
                              />
                              <input
                                type="number"
                                placeholder="Quantity"
                                value={editForm.quantity}
                                onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                                className="edit-input"
                              />
                              <button onClick={() => handleUpdateListing(item.id)} className="save-btn">Save</button>
                              <button onClick={() => setEditingId(null)} className="cancel-btn">Cancel</button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingId(item.id);
                                  setEditForm({ price: item.price, quantity: item.quantity });
                                }}
                                className="edit-btn"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteListing(item.id)}
                                className="delete-btn"
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

              <div className="dashboard-section">
                <h3 className="dashboard-subtitle">My Reserved Purchases</h3>
                {dashboardData.purchases.length === 0 ? (
                  <p className="empty-text">No reserved items.</p>
                ) : (
                  <div className="purchases-list">
                    {dashboardData.purchases.map((p) => (
                      <div key={p.transaction_id} className="purchase-item">
                        <div className="purchase-info">
                          <strong>{p.title}</strong>
                          <span>ZMW {p.total_price}</span>
                          <span className={`status-badge ${p.status.toLowerCase()}`}>
                            {p.status}
                          </span>
                        </div>
                        <button
                          onClick={() => openChat(p.transaction_id)}
                          className="chat-btn"
                        >
                          💬 Open Messenger
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeTxnId && (
                <div className="chat-container">
                  <div className="chat-header">
                    <h4 className="chat-title">
                      💬 Campus Chat ({activeTxnId.substring(0, 8)}...)
                    </h4>
                    <span className="chat-status">● Live</span>
                  </div>
                  <div className="chat-messages">
                    {chatMessages.length === 0 ? (
                      <p className="empty-text">No messages exchanged yet.</p>
                    ) : (
                      chatMessages.map((m) => (
                        <div key={m.id} className={`chat-message ${m.sender_id === (currentUser?.id || currentUser?.user?.id) ? 'sent' : 'received'}`}>
                          <span className="sender-name">{m.sender_name}:</span>
                          <span className="message-text">{m.message_text}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleSendMessage} className="chat-input-form">
                    <input
                      type="text"
                      placeholder="Type message..."
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      className="chat-input"
                    />
                    <button type="submit" className="chat-send-btn">Send</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
