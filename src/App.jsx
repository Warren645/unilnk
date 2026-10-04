
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

// ==================== IDLE LOGOUT ====================
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // sign out after 30 minutes without activity
const IDLE_WARNING_MS = 60 * 1000; // warn during the final minute
const ACTIVITY_KEY = 'lastActivity';

const readLastActivity = () => {
  try {
    const value = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : Date.now();
  } catch (err) {
    return Date.now();
  }
};

const writeLastActivity = (time = Date.now()) => {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(time));
  } catch (err) {
    /* storage unavailable: nothing to do */
  }
};

/*
  Counts real user input only (clicks, typing, touch, scroll, mouse).
  Background polling does not keep a session alive. The last-activity time
  lives in localStorage, so activity in any open tab keeps every tab signed in.
*/
const useIdleLogout = ({ enabled, onTimeout }) => {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const warningRef = useRef(false);
  const lastWriteRef = useRef(0);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  });

  const stayActive = useCallback(() => {
    writeLastActivity();
    lastWriteRef.current = Date.now();
    warningRef.current = false;
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      warningRef.current = false;
      return undefined;
    }

    // Starting point for a fresh session
    try {
      if (!localStorage.getItem(ACTIVITY_KEY)) writeLastActivity();
    } catch (err) {
      /* ignore */
    }

    const onActivity = () => {
      // While the warning is open, only its buttons count
      if (warningRef.current) return;

      const now = Date.now();
      if (now - lastWriteRef.current > 5000) {
        writeLastActivity(now);
        lastWriteRef.current = now;
      }
    };

    const check = () => {
      const idleFor = Date.now() - readLastActivity();

      if (idleFor >= IDLE_TIMEOUT_MS) {
        onTimeoutRef.current();
        return;
      }

      const remaining = IDLE_TIMEOUT_MS - idleFor;

      if (remaining <= IDLE_WARNING_MS) {
        warningRef.current = true;
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else if (warningRef.current) {
        // activity in another tab cancelled the warning
        warningRef.current = false;
        setSecondsLeft(null);
      }
    };

    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
    ];
    events.forEach((name) =>
      window.addEventListener(name, onActivity, { passive: true, capture: true })
    );

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    check(); // handles a session that went stale while the browser was closed
    const timer = setInterval(check, 1000);

    return () => {
      clearInterval(timer);
      events.forEach((name) =>
        window.removeEventListener(name, onActivity, { capture: true })
      );
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);

  return { secondsLeft, stayActive };
};

const IdleWarningModal = ({ secondsLeft, onStay, onLogout }) => (
  <div className="idle-overlay" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
    <div className="idle-dialog">
      <h3 id="idle-title">Still there?</h3>
      <p aria-live="polite">
        For your security, you will be signed out in{' '}
        <strong>{secondsLeft}</strong> second{secondsLeft === 1 ? '' : 's'}{' '}
        because of inactivity.
      </p>
      <div className="idle-actions">
        <button type="button" className="auth-submit-btn" onClick={onStay} autoFocus>
          Stay signed in
        </button>
        <button type="button" className="idle-signout" onClick={onLogout}>
          Sign out now
        </button>
      </div>
    </div>
  </div>
);

// ==================== TOAST HOOK ====================
const useToast = () => {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), duration);
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
// ==================== SMALL HELPERS ====================

// Cloudinary can resize images on delivery. Asking for a smaller version
// makes pages much lighter on mobile data.
const thumb = (url, width = 600) => {
  if (typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  if (/\/upload\/[^/]*(?:w_|c_|q_|f_)[^/]*\//.test(url)) return url;
  return url.replace('/upload/', `/upload/w_${width},c_limit,q_auto,f_auto/`);
};

const REPORT_REASONS = [
  'Scam or fraud',
  'Prohibited item',
  'Inappropriate content',
  'Fake or misleading',
  'Spam or duplicate',
  'Wrong category',
  'Other',
];

const formatMonthYear = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString([], { month: 'short', year: 'numeric' });
};

const formatShortDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

// ==================== LIVE CHAT STREAM ====================
/*
  Keeps one streaming connection open to the server so new messages arrive
  instantly (no polling). EventSource can't send the login token, so this uses
  fetch. If the connection drops it reconnects with a growing delay.
*/
const useChatStream = ({ enabled, onEvent, onOpen, onAuthError }) => {
  const handlers = useRef({ onEvent, onOpen, onAuthError });

  useEffect(() => {
    handlers.current = { onEvent, onOpen, onAuthError };
  });

  useEffect(() => {
    if (!enabled) return undefined;

    let stopped = false;
    let controller = null;
    let retry = 0;
    let timer = null;

    const connect = async () => {
      if (stopped) return;
      controller = new AbortController();

      try {
        const res = await fetch(`${API_BASE}/api/chat/stream`, {
          headers: { ...getAuthHeaders(), Accept: 'text/event-stream' },
          signal: controller.signal,
        });

        if (res.status === 401 || res.status === 403) {
          let body = {};
          try {
            body = await res.json();
          } catch (err) {
            /* not JSON */
          }
          stopped = true;
          handlers.current.onAuthError?.(res.status, body);
          return;
        }

        if (!res.ok || !res.body) throw new Error(`Stream status ${res.status}`);

        retry = 0;
        handlers.current.onOpen?.();

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let end;
          while ((end = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);

            let event = 'message';
            let data = '';
            block.split('\n').forEach((line) => {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              else if (line.startsWith('data:')) data += line.slice(5).trim();
            });

            if (data) {
              try {
                handlers.current.onEvent?.(event, JSON.parse(data));
              } catch (err) {
                /* ignore a malformed event */
              }
            }
          }
        }
      } catch (err) {
        if (stopped) return;
      }

      if (stopped) return;
      retry = Math.min(retry + 1, 6);
      timer = setTimeout(connect, Math.min(30000, 1000 * 2 ** retry));
    };

    connect();

    return () => {
      stopped = true;
      if (controller) controller.abort();
      clearTimeout(timer);
    };
  }, [enabled]);
};

// ==================== STAR RATING ====================
const Stars = ({ value = 0, onChange, size = 16 }) => {
  const rounded = Math.round(value || 0);

  return (
    <span className={`stars ${onChange ? 'stars-input' : ''}`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            className={`star-btn ${n <= rounded ? 'on' : ''}`}
            onClick={() => onChange(n)}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            aria-pressed={n === rounded}
          >
            ★
          </button>
        ) : (
          <span key={n} className={`star ${n <= rounded ? 'on' : ''}`} aria-hidden="true">
            ★
          </span>
        )
      )}
    </span>
  );
};

const RatingLine = ({ rating, count, size = 13 }) =>
  count > 0 ? (
    <span className="rating-line" title={`${rating} out of 5 from ${count} review${count === 1 ? '' : 's'}`}>
      <Stars value={rating} size={size} />
      <span className="rating-num">
        {Number(rating).toFixed(1)} ({count})
      </span>
    </span>
  ) : (
    <span className="rating-line rating-none">No reviews yet</span>
  );

// ==================== REPORT A LISTING ====================
const ReportModal = ({ item, onClose, showToast }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [formError, setFormError] = useState('');

  if (!item) return null;

  const submit = async (e) => {
    e.preventDefault();

    if (!reason) {
      setFormError('Please choose a reason.');
      return;
    }

    setIsSending(true);
    setFormError('');

    try {
      const res = await fetch(`${API_BASE}/api/listings/${item.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ reason, details }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Thanks. A moderator will review this listing.', 'success');
        onClose();
      } else {
        setFormError(data.error || 'Could not send your report.');
      }
    } catch (err) {
      setFormError('Connection error. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={isSending ? undefined : onClose}>
      <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h3 className="adm-modal-title">Report this listing</h3>
        <p className="adm-modal-sub">
          <strong>{item.title}</strong>
          <br />
          Reports are private. Moderators will review the listing.
        </p>

        {formError && (
          <div className="auth-error" role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="adm-reasons">
            {REPORT_REASONS.map((r) => (
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
          <label className="adm-modal-label" htmlFor="report-details">
            Details (optional)
          </label>
          <textarea
            id="report-details"
            className="form-textarea"
            rows="3"
            maxLength={500}
            placeholder="What is wrong with this listing?"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <div className="adm-modal-actions">
            <button type="button" className="adm-btn adm-btn-ghost" onClick={onClose} disabled={isSending}>
              Cancel
            </button>
            <button type="submit" className="adm-btn adm-btn-danger solid" disabled={!reason || isSending}>
              {isSending ? 'Sending...' : 'Send report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== SELLER PROFILE ====================
const SellerProfileModal = ({
  sellerId,
  onClose,
  currentUser,
  isAdmin,
  onOpenChat,
  onRequireLogin,
  showToast,
}) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    if (!sellerId) return;
    setIsLoading(true);
    setLoadError('');

    try {
      const res = await fetch(`${API_BASE}/api/sellers/${sellerId}`, {
        headers: { ...getAuthHeaders() },
      });
      const body = await res.json();

      if (res.ok && body.success) {
        setData(body);
        setRating(body.viewer?.my_review?.rating || 0);
        setComment(body.viewer?.my_review?.comment || '');
      } else {
        setLoadError(body.error || 'Could not load this profile.');
      }
    } catch (err) {
      setLoadError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  if (!sellerId) return null;

  const submitReview = async (e) => {
    e.preventDefault();

    if (!rating) {
      setFormError('Please choose a star rating.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      const res = await fetch(`${API_BASE}/api/sellers/${sellerId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ rating, comment }),
      });
      const body = await res.json();

      if (res.ok && body.success) {
        showToast('Review saved. Thank you!', 'success');
        load();
      } else {
        setFormError(body.error || 'Could not save your review.');
      }
    } catch (err) {
      setFormError('Connection error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMine = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sellers/${sellerId}/reviews`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
      });
      if (res.ok) {
        setRating(0);
        setComment('');
        load();
      }
    } catch (err) {
      setFormError('Connection error. Please try again.');
    }
  };

  const removeReview = async (reviewId) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
      });
      if (res.ok) {
        showToast('Review removed.', 'success');
        load();
      } else {
        showToast('Could not remove the review.', 'error');
      }
    } catch (err) {
      showToast('Connection error.', 'error');
    }
  };

  const seller = data?.seller;
  const viewer = data?.viewer;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {isLoading && !data ? (
          <p className="profile-loading">Loading profile...</p>
        ) : loadError ? (
          <div className="profile-loading">
            <p>{loadError}</p>
            <button className="adm-btn adm-btn-ghost" onClick={load}>
              Try again
            </button>
          </div>
        ) : (
          data && (
            <>
              <div className="profile-head">
                <div className="profile-avatar">{(seller.full_name || 'U').charAt(0)}</div>
                <div className="profile-head-info">
                  <h3>{seller.full_name}</h3>
                  <RatingLine rating={data.stats.rating} count={data.stats.review_count} size={15} />
                  <p className="profile-sub">
                    Member since {formatMonthYear(seller.joined)} · {data.stats.active_count} for sale ·{' '}
                    {data.stats.sold_count} sold
                  </p>
                </div>
              </div>

              {!viewer.is_self && (
                <button
                  className="profile-message-btn"
                  onClick={() => {
                    if (!currentUser) {
                      onRequireLogin();
                      return;
                    }
                    onOpenChat(seller.id, null, seller.full_name);
                    onClose();
                  }}
                >
                  💬 Message {seller.full_name.split(' ')[0]}
                </button>
              )}

              <h4 className="profile-section">For sale now ({data.listings.length})</h4>
              {data.listings.length === 0 ? (
                <p className="profile-empty">Nothing for sale right now.</p>
              ) : (
                <div className="profile-listings">
                  {data.listings.map((l) => {
                    const imgs = parseImages(l.image_url);
                    return (
                      <button
                        key={l.id}
                        className="profile-listing"
                        onClick={() => {
                          if (viewer.is_self) return;
                          if (!currentUser) {
                            onRequireLogin();
                            return;
                          }
                          onOpenChat(seller.id, l.id, seller.full_name, false, l.title);
                          onClose();
                        }}
                        title={viewer.is_self ? l.title : `Ask about ${l.title}`}
                      >
                        <span className="profile-listing-img">
                          {imgs[0] ? <img src={thumb(imgs[0], 300)} alt="" loading="lazy" /> : <span>No photo</span>}
                        </span>
                        <span className="profile-listing-title">{l.title}</span>
                        <span className="profile-listing-price">ZMW {l.price}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <h4 className="profile-section">Sold history ({data.stats.sold_count})</h4>
              {data.sold.length === 0 ? (
                <p className="profile-empty">No completed sales yet.</p>
              ) : (
                <ul className="profile-sold">
                  {data.sold.map((s) => (
                    <li key={s.id}>
                      <span>✓ {s.title}</span>
                      <span className="profile-sold-meta">
                        ZMW {s.price}
                        {s.sold_at ? ` · ${formatShortDate(s.sold_at)}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <h4 className="profile-section">Reviews ({data.stats.review_count})</h4>

              {viewer.is_self ? (
                <p className="profile-empty">This is how other students see your profile.</p>
              ) : !currentUser ? (
                <p className="profile-empty">
                  <button className="link-btn" onClick={onRequireLogin}>
                    Sign in
                  </button>{' '}
                  to leave a review.
                </p>
              ) : viewer.can_review ? (
                <form className="review-form" onSubmit={submitReview}>
                  <p className="review-form-title">
                    {viewer.my_review ? 'Your review' : 'Leave a review'}
                  </p>
                  {formError && (
                    <div className="auth-error" role="alert">
                      {formError}
                    </div>
                  )}
                  <Stars value={rating} onChange={setRating} size={26} />
                  <textarea
                    className="form-textarea"
                    rows="2"
                    maxLength={500}
                    placeholder="How was your experience? (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className="review-actions">
                    <button type="submit" className="adm-btn adm-btn-primary" disabled={isSaving || !rating}>
                      {isSaving ? 'Saving...' : viewer.my_review ? 'Update review' : 'Submit review'}
                    </button>
                    {viewer.my_review && (
                      <button type="button" className="adm-btn adm-btn-ghost" onClick={deleteMine}>
                        Delete my review
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <p className="profile-empty">{viewer.review_hint}</p>
              )}

              {data.reviews.length === 0 ? (
                <p className="profile-empty">No reviews yet.</p>
              ) : (
                <ul className="profile-reviews">
                  {data.reviews.map((r) => (
                    <li key={r.id}>
                      <div className="review-top">
                        <Stars value={r.rating} size={14} />
                        <strong>{r.reviewer_name}</strong>
                        <span className="profile-sold-meta">{formatShortDate(r.created_at)}</span>
                        {isAdmin && (
                          <button className="link-btn danger" onClick={() => removeReview(r.id)}>
                            Remove
                          </button>
                        )}
                      </div>
                      {r.comment && <p className="review-comment">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
};

const ChatInbox = ({ currentUser, onOpenChat, API_BASE, subscribe }) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const refreshTimer = useRef(null);

  const fetchConversations = useCallback(async () => {
    const userId = currentUser?.id || currentUser?.user?.id;
    if (!userId) return;

    try {
      const res = await fetch(`${API_BASE}/api/chat/conversations/${userId}`, {
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setConversations(data.conversations);
        setLoadError('');
      } else {
        setLoadError(data.error || 'Could not load your messages.');
      }
    } catch (err) {
      setLoadError('Connection error. Retrying...');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, API_BASE]);

  useEffect(() => {
    if (!currentUser) return undefined;

    fetchConversations();

    // Safety net only: new messages arrive instantly through the live stream
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [currentUser, fetchConversations]);

  useEffect(() => {
    if (!subscribe) return undefined;

    return subscribe(() => {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(fetchConversations, 250);
    });
  }, [subscribe, fetchConversations]);

  useEffect(() => () => clearTimeout(refreshTimer.current), []);

  const totalUnread = conversations.reduce(
    (sum, conv) => sum + (Number(conv.unread_count) || 0),
    0
  );

  if (isLoading) {
    return <div className="chat-inbox-loading">Loading conversations...</div>;
  }

  if (loadError && conversations.length === 0) {
    return (
      <div className="chat-inbox-empty">
        <p>{loadError}</p>
        <button className="adm-btn adm-btn-ghost" onClick={fetchConversations}>
          Try again
        </button>
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

        {totalUnread > 0 && <span className="unread-badge">{totalUnread} unread</span>}
      </div>

      <div className="conversations-list">
        {conversations.map((conv) => {
          const unread = Number(conv.unread_count) || 0;
          const blocked = conv.blocked_by_me || conv.blocked_me;

                    const convImages = parseImages(conv.listing_image_url);

          return (
            <div
              key={`${conv.user_id}-${conv.listing_id ?? 'general'}`}
              className={`conversation-item ${unread > 0 ? 'has-unread' : ''}`}
              onClick={() =>
                onOpenChat(
                  conv.user_id,
                  conv.listing_id || null,
                  conv.user_name,
                  false,
                  conv.listing_title || ''
                )
              }
            >
              <div className="conversation-avatar">
                <span>{conv.user_name?.charAt(0) || 'U'}</span>

                {unread > 0 && <span className="unread-dot">{unread}</span>}
              </div>

              <div className="conversation-info">
                <div className="conversation-name">
                  {conv.user_name || 'UNILUS Student'}
                  {conv.blocked_by_me && <span className="blocked-tag">Blocked</span>}
                </div>

                                <div className="conversation-item-chip">
                  {conv.listing_id || conv.listing_title ? (
                    <>
                      {convImages[0] && (
                        <img src={thumb(convImages[0], 80)} alt="" loading="lazy" />
                      )}
                      <span className="chip-title">
                        📦 {conv.listing_title || 'Item'}
                      </span>
                      {conv.listing_price != null && (
                        <span className="chip-price">ZMW {conv.listing_price}</span>
                      )}
                      {conv.listing_id && conv.listing_sold && (
                        <span className="chip-tag">Sold</span>
                      )}
                      {!conv.listing_id && (
                        <span className="chip-tag">No longer listed</span>
                      )}
                      {conv.listing_id && !conv.listing_available && (
                        <span className="chip-tag">Unavailable</span>
                      )}
                    </>
                  ) : (
                    <span className="chip-title">💬 General chat</span>
                  )}
                </div>

                <div className="conversation-last-message">
                  {blocked ? 'Messaging unavailable' : conv.last_message || 'No messages yet'}
                </div>
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
          );
        })}
      </div>
    </div>
  );
};

// ============ CHAT MODAL COMPONENT ============
const mergeMessages = (current, incoming) => {
  const byId = new Map();
  [...current, ...incoming].forEach((m) => byId.set(m.id, m));

  return [...byId.values()].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id
  );
};

const CHAT_PAGE_SIZE = 50;

const ChatModal = ({
  isOpen,
  onClose,
  sellerId,
  sellerName,
  listingId,
  listingTitle,
  currentUser,
  API_BASE,
    subscribe,
  onRead,
  onViewProfile,
  onSwitchThread,
}) => {
  const [messages, setMessages] = useState([]);
  const [item, setItem] = useState(null);
  const [otherThreads, setOtherThreads] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [blocked, setBlocked] = useState({ byMe: false, me: false });
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [chatError, setChatError] = useState('');

  const containerRef = useRef(null);
  const endRef = useRef(null);
  const stickRef = useRef(true);
  const prependRef = useRef(null);

    const userId = currentUser?.id || currentUser?.user?.id;
  const otherId = Number(sellerId);
  // Every chat is about ONE item (or "general" when it is not about an item)
  const threadParam = listingId ? String(listingId) : 'general';

  const markAsRead = useCallback(async () => {
    if (!userId || !otherId) return;

    try {
      await fetch(`${API_BASE}/api/chat/mark-read/${userId}/${otherId}?listing_id=${threadParam}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders() },
      });
      onRead?.();
        } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, [API_BASE, userId, otherId, threadParam, onRead]);

  // The other chats with this same person (other items), to jump between them
  const loadOtherThreads = useCallback(async () => {
    if (!userId || !otherId) return;

    try {
      const res = await fetch(`${API_BASE}/api/chat/conversations/${userId}`, {
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setOtherThreads(
          data.conversations.filter(
            (c) =>
              Number(c.user_id) === otherId &&
              Number(c.listing_id || 0) !== Number(listingId || 0)
          )
        );
      }
    } catch (err) {
      /* the chips are optional */
    }
  }, [API_BASE, userId, otherId, listingId]);

  // Newest messages first-page; "silent" refreshes merge instead of replacing
  const loadLatest = useCallback(
    async ({ silent = false } = {}) => {
      if (!userId || !otherId) return;

      try {
        const res = await fetch(
                    `${API_BASE}/api/chat/messages/${userId}/${otherId}?limit=${CHAT_PAGE_SIZE}&listing_id=${threadParam}`,
          { headers: { ...getAuthHeaders() } }
        );
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.listing) setItem(data.listing);
          setMessages((prev) =>
            silent ? mergeMessages(prev, data.messages || []) : data.messages || []
          );
          if (!silent) setHasMore(Boolean(data.has_more));
          setBlocked({ byMe: Boolean(data.blocked_by_me), me: Boolean(data.blocked_me) });
          if (!silent) setChatError('');
        } else if (!silent) {
          setChatError(data.error || 'Could not load messages.');
        }
      } catch (err) {
        if (!silent) setChatError('Connection error. Could not load messages.');
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
        [API_BASE, userId, otherId, threadParam]
  );

  const loadOlder = async () => {
    if (isLoadingOlder || !hasMore) return;
    setIsLoadingOlder(true);

    try {
      const res = await fetch(
                `${API_BASE}/api/chat/messages/${userId}/${otherId}?limit=${CHAT_PAGE_SIZE}&offset=${messages.length}&listing_id=${threadParam}`,
        { headers: { ...getAuthHeaders() } }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        if (containerRef.current) {
          prependRef.current = containerRef.current.scrollHeight;
        }
        setMessages((prev) => mergeMessages(prev, data.messages || []));
        setHasMore(Boolean(data.has_more));
      } else {
        setChatError(data.error || 'Could not load earlier messages.');
      }
    } catch (err) {
      setChatError('Connection error. Could not load earlier messages.');
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // Open / switch conversation
  useEffect(() => {
    if (!isOpen || !otherId || !userId) return undefined;

        setMessages([]);
    setItem(null);
    setHasMore(false);
    setIsLoading(true);
    setChatError('');
    setConfirmBlock(false);
    setNewMessage('');
    stickRef.current = true;

    loadLatest();
    markAsRead();
    loadOtherThreads();

    // Safety net only: messages normally arrive through the live stream
    const interval = setInterval(() => loadLatest({ silent: true }), 20000);
    return () => clearInterval(interval);
    }, [isOpen, otherId, userId, loadLatest, markAsRead, loadOtherThreads]);

  // Live messages
  useEffect(() => {
    if (!isOpen || !subscribe || !otherId || !userId) return undefined;

        return subscribe((event, payload) => {
      if (event === 'read') {
        loadOtherThreads();
        return;
      }

      if (event !== 'message') return;

      const fromThem =
        Number(payload.sender_id) === otherId && Number(payload.receiver_id) === Number(userId);
      const fromMe =
        Number(payload.sender_id) === Number(userId) && Number(payload.receiver_id) === otherId;

      if (!fromThem && !fromMe) return;

      // A message about a DIFFERENT item belongs to that item's own chat
      if (Number(payload.listing_id || 0) !== Number(listingId || 0)) {
        loadOtherThreads();
        return;
      }

      setMessages((prev) => mergeMessages(prev, [payload]));
      if (fromThem) markAsRead();
    });
  }, [isOpen, subscribe, otherId, userId, listingId, markAsRead, loadOtherThreads]);

  // Keep the view where the reader expects it
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (prependRef.current !== null) {
      el.scrollTop += el.scrollHeight - prependRef.current;
      prependRef.current = null;
    } else if (stickRef.current) {
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    const text = newMessage.trim();
    if (!text || !currentUser || isSending) return;

    setIsSending(true);
    setChatError('');

    try {
      const res = await fetch(`${API_BASE}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          receiver_id: otherId,
          listing_id: listingId,
          message: text,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setNewMessage('');
        stickRef.current = true;
        setMessages((prev) => mergeMessages(prev, [data.message]));
      } else {
        if (data.code === 'BLOCKED') setBlocked((b) => ({ ...b, me: true }));
        setChatError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setChatError('Connection error. Your message was not sent.');
    } finally {
      setIsSending(false);
    }
  };

  const changeBlock = async (shouldBlock) => {
    try {
      const res = await fetch(`${API_BASE}/api/blocks/${otherId}`, {
        method: shouldBlock ? 'POST' : 'DELETE',
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setBlocked((b) => ({ ...b, byMe: shouldBlock }));
        setConfirmBlock(false);
        setChatError('');
        onRead?.();
      } else {
        setChatError(data.error || 'Could not update the block.');
      }
    } catch (err) {
      setChatError('Connection error. Please try again.');
    }
  };

  if (!isOpen) return null;

  const canSend = !blocked.byMe && !blocked.me;

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-header">
          <div className="chat-header-info">
                        <h3>💬 Chat with {sellerName || 'Seller'}</h3>

            {listingId ? (
              <div className="chat-item-card">
                {parseImages(item?.image_url)[0] && (
                  <img src={thumb(parseImages(item.image_url)[0], 120)} alt="" />
                )}
                <div className="chat-item-info">
                  <span className="chat-item-label">About this item</span>
                  <strong>{item?.title || listingTitle || 'Item'}</strong>
                  {item && (
                    <span className="chat-item-meta">
                      ZMW {item.price}
                      {item.is_sold ? ' · Sold' : ''}
                      {item.available === false ? ' · No longer available' : ''}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="chat-listing-title">💬 General chat (not about a specific item)</p>
            )}


            <div className="chat-header-links">
              <button className="link-btn" onClick={() => onViewProfile?.(otherId)}>
                View profile
              </button>
              {!blocked.byMe && (
                <button className="link-btn danger" onClick={() => setConfirmBlock((v) => !v)}>
                  Block
                </button>
              )}
            </div>
          </div>

          <button className="modal-close-btn" onClick={onClose} aria-label="Close chat">
            ×
          </button>
        </div>

                {otherThreads.length > 0 && (
          <div className="chat-threads" aria-label="Other chats with this person">
            <span className="chat-threads-label">Other chats with {sellerName || 'them'}:</span>
            {otherThreads.map((c) => (
              <button
                key={c.listing_id ?? 'general'}
                type="button"
                className="chat-thread-chip"
                onClick={() =>
                  onSwitchThread?.(c.listing_id || null, c.listing_title || '')
                }
              >
                {c.listing_id || c.listing_title
                  ? `📦 ${c.listing_title || 'Item'}`
                  : '💬 General'}
                {Number(c.unread_count) > 0 && (
                  <span className="chip-unread">{c.unread_count}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {confirmBlock && (
          <div className="chat-notice chat-notice-warn" role="alert">
            <span>
              Block {sellerName || 'this user'}? Neither of you will be able to send messages.
            </span>
            <span className="chat-notice-actions">
              <button className="adm-btn adm-btn-danger solid" onClick={() => changeBlock(true)}>
                Block
              </button>
              <button className="adm-btn adm-btn-ghost" onClick={() => setConfirmBlock(false)}>
                Cancel
              </button>
            </span>
          </div>
        )}

        {blocked.byMe && (
          <div className="chat-notice" role="status">
            <span>You blocked this user.</span>
            <button className="adm-btn adm-btn-ghost" onClick={() => changeBlock(false)}>
              Unblock
            </button>
          </div>
        )}

        {blocked.me && !blocked.byMe && (
          <div className="chat-notice" role="status">
            <span>You can't send messages to this user.</span>
          </div>
        )}

        <div className="chat-messages-container" ref={containerRef} onScroll={handleScroll}>
          {isLoading ? (
            <div className="chat-empty">
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
                        <div className="chat-empty">
              <span>💬</span>
              <p>
                {listingId
                  ? `No messages yet. Ask ${sellerName || 'the seller'} about "${
                      item?.title || listingTitle || 'this item'
                    }".`
                  : 'No messages yet. Start the conversation!'}
              </p>
            </div>
          ) : (
            <>
              {hasMore && (
                <button className="load-older-btn" onClick={loadOlder} disabled={isLoadingOlder}>
                  {isLoadingOlder ? 'Loading...' : 'Load earlier messages'}
                </button>
              )}

              {messages.map((msg) => {
                const isSent = Number(msg.sender_id) === Number(userId);

                return (
                  <div key={msg.id} className={`chat-message ${isSent ? 'sent' : 'received'}`}>
                                        <div className="message-bubble">
                      <span className="sender-name">{msg.sender_name || 'Student'}</span>
                      {!listingId && msg.listing_title && (
                        <span className="message-about">re: {msg.listing_title}</span>
                      )}


                      <span className="message-text">{msg.message}</span>

                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleString([], {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div ref={endRef} />
            </>
          )}
        </div>

        {chatError && (
          <div className="chat-notice chat-notice-error" role="alert">
            {chatError}
          </div>
        )}

        <form onSubmit={sendMessage} className="chat-input-form">
          <input
            type="text"
            placeholder={canSend ? 'Type your message...' : 'Messaging is unavailable'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="chat-input"
            disabled={isSending || !canSend}
            maxLength={2000}
          />

          <button type="submit" className="chat-send-btn" disabled={isSending || !canSend}>
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
  onViewSeller,
  isFavorite = false,
  onToggleFavorite,
  onReport,
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
      item.seller_name || 'Seller',
      false,
      item.title
    );
  };

  const isOwn =
    !!currentUser &&
    Number(currentUser.id || currentUser.user?.id) === Number(item.seller_id);
  const canChat = !!currentUser && !isOwn && !item.is_sold;

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
                            src={thumb(images[activeImgIndex], 600)}
              loading="lazy"
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

                    {currentUser && onToggleFavorite && (
            <button
              type="button"
              className={`fav-btn ${isFavorite ? 'on' : ''}`}
              onClick={() => onToggleFavorite(item)}
              aria-label={isFavorite ? 'Remove from saved listings' : 'Save this listing'}
              aria-pressed={isFavorite}
              title={isFavorite ? 'Remove from saved' : 'Save for later'}
            >
              {isFavorite ? '♥' : '♡'}
            </button>
          )}
          {item.is_sold && <span className="sold-overlay">SOLD</span>}
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
                onViewSeller(item.seller_id)
              }
              onMouseEnter={(e) =>
                (e.target.style.color = THEME.emerald)
              }
              onMouseLeave={(e) =>
                (e.target.style.color = '#E2E8F0')
              }
              title="View seller profile and reviews"
            >
              {item.seller_name || 'UNILUS Student'}
            </strong>
            {item.seller_review_count !== undefined && (
              <span style={{ marginLeft: '8px' }}>
                <RatingLine
                  rating={item.seller_rating}
                  count={item.seller_review_count}
                  size={12}
                />
              </span>
            )}
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
                    disabled={!canChat}

          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'transparent',
            color: canChat ? THEME.goldAccent : THEME.textMuted,
            border: `1px solid ${
              canChat ? THEME.goldAccent : '#475569'
            }`,
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: canChat ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
          title={
            !currentUser
              ? 'Please login to chat'
              : isOwn
              ? 'This is your listing'
              : 'Ask seller about this item'
          }
        >
                    {isOwn ? 'Your listing' : item.is_sold ? 'Sold' : '💬 Ask Seller'}
        </button>
        {currentUser && !isOwn && onReport && (
          <button
            type="button"
            className="report-link"
            onClick={() => onReport(item)}
          >
            ⚑ Report this listing
          </button>
        )}
      </div>
    </div>
  );
};

// ============ AUTH MODAL ============
const AuthModal = ({
  isOpen,
  onClose,
  onAuthSuccess,
  showToast,
  initialMode = 'login',
  resetToken = '',
  onResetComplete = () => {},
}) => {
  // modes: 'login' | 'register' | 'forgot' | 'reset'
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login');
  const isRegister = mode === 'register';

  const [authData, setAuthData] = useState({
    full_name: '',
    email: '',
    password: '',
    student_id: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [formError, setFormError] = useState('');
  const errorRef = useRef(null);

  // Each time the modal opens, start on the screen the user asked for
  useEffect(() => {
    if (isOpen) {
      setMode(resetToken ? 'reset' : initialMode);
      setFormError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Bring the error into view (the modal can scroll on small screens)
  useEffect(() => {
    if (formError && errorRef.current) {
      errorRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [formError]);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const id = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const post = async (endpoint, body) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const switchMode = (next) => {
    setFormError('');
    setMode(next);
    setAuthData((d) => ({ ...d, password: '' }));
    setConfirmPassword('');
  };

  const showCheckEmail = (email) => {
    setPendingEmail(email);
    setResendIn(60);
    switchMode('check-email');
  };

  const handleResend = async () => {
    if (resendIn > 0 || !pendingEmail) return;
    setResendIn(60);

    try {
      const data = await post('/api/auth/resend-verification', {
        email: pendingEmail,
      });

      if (data.success) {
        setFormError('');
        showToast(
          'If that account needs verification, a new link has been sent.',
          'success'
        );
      } else {
        setFormError(data.error || 'Could not resend email');
      }
    } catch (err) {
      setFormError('Connection error. Please check your internet and try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (
      (mode === 'register' || mode === 'reset') &&
      !evaluatePassword(authData.password).allRulesMet
    ) {
      setFormError('Your password does not meet all the requirements listed below.');
      return;
    }

    if (mode === 'reset' && authData.password !== confirmPassword) {
      setFormError('The two passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'forgot') {
        const data = await post('/api/auth/forgot-password', {
          email: authData.email,
        });

        if (data.success) {
          showToast(
            'If an account exists for that email, a reset link has been sent. Check your inbox.',
            'success'
          );
          switchMode('login');
        } else {
          setFormError(data.error || 'Could not send reset link');
        }
        return;
      }

      if (mode === 'reset') {
        const data = await post('/api/auth/reset-password', {
          token: resetToken,
          password: authData.password,
        });

        if (data.success) {
          showToast('Password updated. Please sign in.', 'success');
          onResetComplete();
          switchMode('login');
        } else {
          setFormError(data.error || 'Could not reset password');
        }
        return;
      }

      const data = await post(
        isRegister ? '/api/auth/register' : '/api/auth/login',
        authData
      );

      if (data.success) {
        if (isRegister) {
          showToast(
            'Account created! Check your email to verify it.',
            'success'
          );
          showCheckEmail(authData.email);
        } else {
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('token', data.token);
          writeLastActivity();

          onAuthSuccess(data.user);

          showToast(
            `Welcome, ${data.user.full_name || data.user.email}!`,
            'success'
          );

          onClose();
        }
      } else if (data.code === 'EMAIL_NOT_VERIFIED') {
        showCheckEmail(authData.email);
        setFormError(
          'Your email is not verified yet. Open the link we emailed you, or resend it below.'
        );
      } else {
        setFormError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setFormError('Connection error. Please check your internet and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const titles = {
    login: ['Welcome Back', 'Sign in to your student account'],
    register: ['Create Account', 'Join the UNILUS student marketplace'],
    forgot: ['Forgot Password', "Enter your email and we'll send a reset link"],
    reset: ['Set New Password', 'Choose a strong new password'],
    'check-email': ['Check Your Email', 'One more step to activate your account'],
  };

  const submitLabels = {
    login: 'Sign In',
    register: 'Create Account',
    forgot: 'Send Reset Link',
    reset: 'Update Password',
    'check-email': '',
  };

  const needsStrongPassword = mode === 'register' || mode === 'reset';

  const handleClose = () => {
    setFormError('');
    if (mode === 'reset') onResetComplete();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={handleClose}>
          ×
        </button>

        <div className="auth-header">
          <div className="auth-logo">U</div>
          <h2>{titles[mode][0]}</h2>
          <p>{titles[mode][1]}</p>
        </div>

        {formError && (
          <div className="auth-error" role="alert" ref={errorRef}>
            {formError}
          </div>
        )}

        {mode === 'check-email' ? (
          <div className="verify-panel">
            <p>
              We sent a verification link to <strong>{pendingEmail}</strong>.
              Click it to activate your account, then sign in.
            </p>
            <p className="verify-hint">
              Can't find it? Check your spam folder. The link expires in 24
              hours.
            </p>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={handleResend}
              disabled={resendIn > 0}
            >
              {resendIn > 0 ? `Resend email in ${resendIn}s` : 'Resend email'}
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                required
                value={authData.full_name}
                onChange={(e) =>
                  setAuthData({ ...authData, full_name: e.target.value })
                }
              />

              <input
                type="text"
                placeholder="Student ID (e.g. UNILUS-2024-001)"
                required
                value={authData.student_id}
                onChange={(e) =>
                  setAuthData({ ...authData, student_id: e.target.value })
                }
              />
            </>
          )}

          {mode !== 'reset' && (
            <input
              type="email"
              placeholder="Student Email (@unilus.ac.zm)"
              required
              value={authData.email}
              onChange={(e) =>
                setAuthData({ ...authData, email: e.target.value })
              }
            />
          )}

          {mode !== 'forgot' && (
            <PasswordField
              value={authData.password}
              showStrength={needsStrongPassword}
              placeholder={mode === 'reset' ? 'New password' : 'Password'}
              autoComplete={
                needsStrongPassword ? 'new-password' : 'current-password'
              }
              onChange={(e) =>
                setAuthData({ ...authData, password: e.target.value })
              }
            />
          )}

          {mode === 'reset' && (
            <>
              <PasswordField
                value={confirmPassword}
                showStrength={false}
                placeholder="Confirm new password"
                autoComplete="new-password"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && authData.password !== confirmPassword && (
                <span className="password-mismatch">
                  Passwords do not match
                </span>
              )}
            </>
          )}

          {mode === 'login' && (
            <button
              type="button"
              className="forgot-link"
              onClick={() => switchMode('forgot')}
            >
              Forgot password?
            </button>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              (needsStrongPassword &&
                !evaluatePassword(authData.password).allRulesMet) ||
              (mode === 'reset' && authData.password !== confirmPassword)
            }
            className="auth-submit-btn"
          >
            {isLoading ? 'Processing...' : submitLabels[mode]}
          </button>
        </form>
        )}

        {mode === 'forgot' || mode === 'reset' || mode === 'check-email' ? (
          <p className="auth-toggle" onClick={() => switchMode('login')}>
            Back to sign in
          </p>
        ) : (
          <p
            className="auth-toggle"
            onClick={() => switchMode(isRegister ? 'login' : 'register')}
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : 'Need an account? Sign up'}
          </p>
        )}
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

// ============ ADMIN: REPORTS QUEUE ============
const AdminReports = ({ showToast, onRemoveListing, onChanged, refreshKey }) => {
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/reports?status=${status}&page=${page}&limit=15`,
        { headers: { ...getAuthHeaders() } }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setReports(data.reports);
        setPagination(data.pagination);
      } else {
        setLoadError(data.error || 'Could not load reports.');
      }
    } catch (err) {
      setLoadError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handle = async (report, action) => {
    setBusyId(report.id);

    try {
      const res = await fetch(`${API_BASE}/api/admin/reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(action === 'dismiss' ? 'Report dismissed.' : 'Report resolved.', 'success');
        await load();
        onChanged();
      } else {
        showToast(data.error || 'Could not update the report.', 'error');
        load();
      }
    } catch (err) {
      showToast('Connection error.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="adm-pills">
        {[
          ['open', 'Open'],
          ['resolved', 'Resolved'],
          ['dismissed', 'Dismissed'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`adm-pill ${status === key ? 'active' : ''}`}
            onClick={() => {
              setStatus(key);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
        <span className="adm-result-count">
          {pagination.total} report{pagination.total === 1 ? '' : 's'}
        </span>
      </div>

      {loadError ? (
        <div className="adm-empty">
          <p>{loadError}</p>
          <button className="adm-btn adm-btn-ghost" onClick={load}>
            Try again
          </button>
        </div>
      ) : isLoading && reports.length === 0 ? (
        <div className="adm-empty">
          <p>Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon">{status === 'open' ? '✅' : '📋'}</span>
          <p>{status === 'open' ? 'No open reports. Nice work.' : 'Nothing here yet.'}</p>
        </div>
      ) : (
        <div className={`adm-list ${isLoading ? 'is-loading' : ''}`}>
          {reports.map((r) => {
            const imgs = parseImages(r.image_url);

            return (
              <div key={r.id} className={`adm-row ${r.status === 'open' ? 'flagged' : ''}`}>
                <div className="adm-row-main">
                  <div className="adm-thumb">
                    {imgs[0] ? <img src={thumb(imgs[0], 200)} alt="" loading="lazy" /> : <span>No photo</span>}
                  </div>
                  <div className="adm-info">
                    <div className="adm-info-top">
                      <h3 className="adm-item-title">{r.title}</h3>
                      <div className="adm-badges">
                        <span className="adm-badge adm-badge-flag">{r.reason}</span>
                        {r.open_reports_for_listing > 1 && r.status === 'open' && (
                          <span className="adm-badge adm-badge-repeat">
                            {r.open_reports_for_listing} reports on this listing
                          </span>
                        )}
                        {r.removed_at && <span className="adm-badge adm-badge-sold">Removed</span>}
                        {r.seller_banned && <span className="adm-badge adm-badge-sold">Seller suspended</span>}
                      </div>
                    </div>
                    <p className="adm-meta">
                      ZMW {r.price} · {r.category || 'Other'} · Reported {formatDate(r.created_at)} by{' '}
                      {r.reporter_name || 'a student'}
                    </p>
                    <p className="adm-seller">
                      Seller: <strong>{r.seller_name || 'Unknown'}</strong>
                      {r.seller_email && <span className="adm-seller-detail">{r.seller_email}</span>}
                      {r.seller_prior_removals > 0 && (
                        <span className="adm-badge adm-badge-repeat">
                          {r.seller_prior_removals} earlier removal{r.seller_prior_removals === 1 ? '' : 's'}
                        </span>
                      )}
                    </p>
                    {r.details && <p className="adm-log-note">“{r.details}”</p>}
                    {r.status !== 'open' && r.resolution_note && (
                      <p className="adm-log-note">Note: {r.resolution_note}</p>
                    )}
                  </div>
                  {r.status === 'open' && (
                    <div className="adm-actions">
                      {!r.removed_at && (
                        <button
                          className="adm-btn adm-btn-danger"
                          onClick={() =>
                            onRemoveListing({
                              id: r.listing_id,
                              title: r.title,
                              seller_name: r.seller_name,
                            })
                          }
                        >
                          Remove listing
                        </button>
                      )}
                      <button
                        className="adm-btn adm-btn-ghost"
                        disabled={busyId === r.id}
                        onClick={() => handle(r, 'dismiss')}
                      >
                        Dismiss
                      </button>
                      {r.removed_at && (
                        <button
                          className="adm-btn adm-btn-ghost"
                          disabled={busyId === r.id}
                          onClick={() => handle(r, 'resolve')}
                        >
                          Mark resolved
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div className="adm-pager">
          <button className="adm-btn adm-btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pagination.total_pages}
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
  );
};

// ============ ADMIN: USERS ============
const BAN_REASONS = [
  'Repeated rule violations',
  'Scam or fraud',
  'Harassment',
  'Spam',
  'Other',
];

const AdminUsers = ({ showToast, onChanged }) => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [banTarget, setBanTarget] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [banNote, setBanNote] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (filter !== 'all') params.set('status', filter);

      const res = await fetch(`${API_BASE}/api/admin/users?${params}`, {
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        setLoadError(data.error || 'Could not load users.');
      }
    } catch (err) {
      setLoadError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmBan = async () => {
    if (!banTarget || !banReason) return;
    setIsBusy(true);
    setModalError('');

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${banTarget.id}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ reason: banReason, note: banNote }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(`${banTarget.full_name} was suspended.`, 'success');
        setBanTarget(null);
        await load();
        onChanged();
      } else {
        setModalError(data.error || 'Could not suspend this account.');
      }
    } catch (err) {
      setModalError('Connection error. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const unban = async (user) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}/unban`, {
        method: 'PUT',
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(`${user.full_name} was reinstated.`, 'success');
        await load();
        onChanged();
      } else {
        showToast(data.error || 'Could not reinstate this account.', 'error');
      }
    } catch (err) {
      showToast('Connection error.', 'error');
    }
  };

  return (
    <>
      <div className="adm-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, email or student ID..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="adm-pills">
        {[
          ['all', 'Everyone'],
          ['banned', 'Suspended'],
          ['admins', 'Admins'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`adm-pill ${filter === key ? 'active' : ''}`}
            onClick={() => {
              setFilter(key);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
        <span className="adm-result-count">
          {pagination.total} user{pagination.total === 1 ? '' : 's'}
        </span>
      </div>

      {loadError ? (
        <div className="adm-empty">
          <p>{loadError}</p>
          <button className="adm-btn adm-btn-ghost" onClick={load}>
            Try again
          </button>
        </div>
      ) : isLoading && users.length === 0 ? (
        <div className="adm-empty">
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon">🔍</span>
          <p>No users match.</p>
        </div>
      ) : (
        <div className={`adm-list ${isLoading ? 'is-loading' : ''}`}>
          {users.map((u) => (
            <div key={u.id} className={`adm-row ${u.is_banned ? 'flagged' : ''}`}>
              <div className="adm-row-main">
                <div className="adm-info">
                  <div className="adm-info-top">
                    <h3 className="adm-item-title">{u.full_name}</h3>
                    <div className="adm-badges">
                      {u.role === 'admin' && <span className="adm-badge adm-badge-sold">Admin</span>}
                      {u.is_banned && <span className="adm-badge adm-badge-flag">Suspended</span>}
                      {!u.email_verified && <span className="adm-badge adm-badge-repeat">Unverified</span>}
                      {u.removals > 0 && (
                        <span className="adm-badge adm-badge-repeat">
                          {u.removals} removal{u.removals === 1 ? '' : 's'}
                        </span>
                      )}
                      {u.reports_received > 0 && (
                        <span className="adm-badge adm-badge-repeat">
                          {u.reports_received} report{u.reports_received === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="adm-meta">
                    {u.email}
                    {u.student_id ? ` · ID ${u.student_id}` : ''} · Joined {formatDate(u.created_at)} ·{' '}
                    {u.active_listings} active listing{u.active_listings === 1 ? '' : 's'}
                  </p>
                  {u.is_banned && u.ban_reason && <p className="adm-log-note">Suspended: {u.ban_reason}</p>}
                </div>
                <div className="adm-actions">
                  {u.is_banned ? (
                    <button className="adm-btn adm-btn-ghost" onClick={() => unban(u)}>
                      Reinstate
                    </button>
                  ) : (
                    u.role !== 'admin' && (
                      <button
                        className="adm-btn adm-btn-danger"
                        onClick={() => {
                          setBanTarget(u);
                          setBanReason('');
                          setBanNote('');
                          setModalError('');
                        }}
                      >
                        Suspend
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div className="adm-pager">
          <button className="adm-btn adm-btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pagination.total_pages}
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

      {banTarget && (
        <div className="modal-overlay" onClick={isBusy ? undefined : () => setBanTarget(null)}>
          <div className="modal-content adm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setBanTarget(null)} aria-label="Close">
              ×
            </button>
            <h3 className="adm-modal-title">Suspend {banTarget.full_name}?</h3>
            <p className="adm-modal-sub">
              They will be signed out immediately and cannot sign in. Their listings are hidden from the
              marketplace until you reinstate them.
            </p>
            {modalError && (
              <div className="auth-error" role="alert">
                {modalError}
              </div>
            )}
            <p className="adm-modal-label">Reason</p>
            <div className="adm-reasons">
              {BAN_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`adm-reason ${banReason === r ? 'active' : ''}`}
                  onClick={() => setBanReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <label className="adm-modal-label" htmlFor="ban-note">
              Internal note (optional)
            </label>
            <textarea
              id="ban-note"
              className="form-textarea"
              rows="2"
              maxLength={500}
              value={banNote}
              onChange={(e) => setBanNote(e.target.value)}
            />
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-ghost" onClick={() => setBanTarget(null)} disabled={isBusy}>
                Cancel
              </button>
              <button className="adm-btn adm-btn-danger solid" onClick={confirmBan} disabled={!banReason || isBusy}>
                {isBusy ? 'Suspending...' : 'Suspend account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const LOG_ACTION_LABELS = {
  remove: 'Listing removed',
  restore: 'Listing restored',
  ban: 'Account suspended',
  unban: 'Account reinstated',
  review_remove: 'Review removed',
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
  const [reportsKey, setReportsKey] = useState(0);

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
        setReportsKey((k) => k + 1);
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

    const restoreListing = async (item) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/listings/${item.id}/restore`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Listing restored and the seller was notified.', 'success');
        setExpandedId(null);
        await Promise.all([fetchListings(), fetchStats(), onListingsChanged()]);
      } else {
        showToast(data.error || 'Failed to restore listing.', 'error');
      }
    } catch (err) {
      console.error('Failed to restore listing:', err);
      showToast('Failed to restore listing. Check your connection.', 'error');
    }
  };

  const STATUS_FILTERS = [
    { key: 'all', label: 'All listings' },
    { key: 'reported', label: 'Reported', count: stats?.open_reports },
    { key: 'flagged', label: 'Flagged', count: stats?.flagged_listings },
    { key: 'active', label: 'Active' },
    { key: 'sold', label: 'Sold' },
    { key: 'removed', label: 'Removed', count: stats?.removed_listings },
  ];

  const hasFilters =
    search || status !== 'all' || category !== 'All' || campus !== 'All';

  return (
    <div className="adm">
      <div className="adm-head">
        <div>
          <h2 className="adm-title">Moderation</h2>
          <p className="adm-sub">
                        Handle reports, review listings, and manage accounts.
          </p>
        </div>

        <div className="adm-views">
          <button
            className={`adm-view-btn ${view === 'reports' ? 'active' : ''}`}
            onClick={() => setView('reports')}
          >
            Reports
            {stats?.open_reports > 0 && (
              <span className="adm-pill-count">{stats.open_reports}</span>
            )}
          </button>
          <button
            className={`adm-view-btn ${view === 'listings' ? 'active' : ''}`}
            onClick={() => setView('listings')}
          >
            Listings
          </button>
          <button
            className={`adm-view-btn ${view === 'users' ? 'active' : ''}`}
            onClick={() => setView('users')}
          >
            Users
          </button>
          <button
            className={`adm-view-btn ${view === 'log' ? 'active' : ''}`}
            onClick={() => setView('log')}
          >
            History
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

                    <button
            className={`adm-stat adm-stat-flag ${
              stats.open_reports > 0 ? 'has-flags' : ''
            }`}
            onClick={() => setView('reports')}
          >
            <span className="adm-stat-num">{stats.open_reports}</span>
            <span className="adm-stat-label">Open reports</span>
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
          <button
            className="adm-stat"
            onClick={() => setView('users')}
          >
            <span className="adm-stat-num">{stats.banned_users}</span>
            <span className="adm-stat-label">Suspended</span>
          </button>
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
                                                        src={thumb(images[0], 200)}
                            alt=""
                            loading="lazy"
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
                            {item.removed_at && (
                              <span className="adm-badge adm-badge-sold">
                                Removed
                              </span>
                            )}
                            {item.open_reports > 0 && (
                              <span className="adm-badge adm-badge-flag">
                                {item.open_reports} report
                                {item.open_reports === 1 ? '' : 's'}
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

                        {item.removed_at ? (
                          <button
                            className="adm-btn adm-btn-primary"
                            onClick={() => restoreListing(item)}
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            className="adm-btn adm-btn-danger"
                            onClick={() => openRemove(item)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="adm-details">
                                                {item.removed_at && (
                          <div className="adm-detail-block">
                            <h4>Removed</h4>
                            <p className="adm-desc">
                              {item.removed_reason}
                              {item.removed_note ? ` — ${item.removed_note}` : ''}
                              {' · '}
                              {formatDate(item.removed_at)}. Permanently
                              deleted 30 days after removal unless restored.
                            </p>
                          </div>
                        )}
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
              <p>No moderation actions yet.</p>
              <p className="adm-empty-sub">
                Removals, restores, suspensions and review removals are recorded here with the reason and who did it.
              </p>
            </div>
          ) : (
            <div className="adm-list">
              {logEntries.map((entry) => (
                <div key={entry.id} className="adm-log-row">
                  <div className="adm-log-main">
                    <strong>{entry.listing_title || entry.seller_name || 'Deleted listing'}</strong>
                    <span className="adm-log-reason">{entry.reason}</span>
                  </div>

                  <p className="adm-meta">
                    {LOG_ACTION_LABELS[entry.action] || 'Removed'} · Account: {entry.seller_name || 'Unknown'} · By{' '}
                    {entry.admin_name || 'an admin'} ·{' '}
                    {new Date(entry.created_at).toLocaleString([], {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {['remove', 'restore'].includes(entry.action) &&
                      (entry.seller_notified
                        ? ' · Seller notified'
                        : ' · Seller not notified')}
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

            {view === 'reports' && (
        <AdminReports
          showToast={showToast}
          refreshKey={reportsKey}
          onRemoveListing={openRemove}
          onChanged={() => {
            fetchStats();
            fetchListings();
          }}
        />
      )}

      {view === 'users' && (
        <AdminUsers showToast={showToast} onChanged={fetchStats} />
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
              {removeTarget.seller_name || 'Unknown'} will be hidden from
              the marketplace. You can restore it for 30 days; after that it is
              deleted permanently with its photos.
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
  const [resetToken, setResetToken] = useState(
    () => new URLSearchParams(window.location.search).get('reset_token') || ''
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => !!resetToken);
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    // Remove the token from the address bar so it isn't left in history or shared
    if (window.location.search.includes('reset_token')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const [chatModal, setChatModal] = useState({
    isOpen: false,
    sellerId: null,
    listingId: null,
    listingTitle: '',
  });

  const [unreadTotal, setUnreadTotal] = useState(0);
  const chatListeners = useRef(new Set());
  const chatModalRef = useRef(null);
  const [profileSellerId, setProfileSellerId] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [savedListings, setSavedListings] = useState([]);
  const [isSavedLoading, setIsSavedLoading] = useState(false);
  const savedMutations = useRef(0);

  // Marketplace browsing: search, filters, sorting and paging happen on the server
  const [sortBy, setSortBy] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [applied, setApplied] = useState({ search: '', min: '', max: '' });
  const [listingMeta, setListingMeta] = useState({ page: 1, total: 0, hasMore: false });
  const [isListingsLoading, setIsListingsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [listingsError, setListingsError] = useState('');
  const listingsRequest = useRef(0);
  const sentinelRef = useRef(null);

  const { toast, showToast } = useToast();

  useEffect(() => {
    const verifyToken = new URLSearchParams(window.location.search).get(
      'verify_token'
    );
    if (!verifyToken) return;

    // Remove the token from the address bar right away
    window.history.replaceState({}, '', window.location.pathname);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: verifyToken }),
        });
        const data = await res.json();

        if (data.success) {
          showToast('Email verified! You can now sign in.', 'success');
          setAuthMode('login');
          setIsAuthModalOpen(true);
        } else {
          showToast(data.error || 'Verification failed', 'error');
        }
      } catch (err) {
        showToast('Connection error. Please try again.', 'error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const currentUserId = currentUser?.id || currentUser?.user?.id || null;

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
  const buildListingParams = useCallback(
    (page) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
        sort: sortBy,
      });

      if (applied.search) params.set('search', applied.search);
      if (selectedCategory !== 'All') params.set('category', selectedCategory);
      if (selectedCampus !== 'All') params.set('campus', selectedCampus);
      if (applied.min !== '') params.set('min_price', applied.min);
      if (applied.max !== '') params.set('max_price', applied.max);

      return params.toString();
    },
    [applied, selectedCategory, selectedCampus, sortBy]
  );

  // Loads page 1 (also used to refresh after any listing change)
  const fetchListings = useCallback(async () => {
    const requestId = ++listingsRequest.current;
    setIsListingsLoading(true);
    setListingsError('');

    try {
      const res = await fetch(`${API_BASE}/api/listings?${buildListingParams(1)}`);
      const data = await res.json();

      if (requestId !== listingsRequest.current) return;

      if (res.ok && data.success) {
        setListings(data.data);
        setListingMeta({
          page: 1,
          total: data.pagination.total,
          hasMore: data.pagination.has_more,
        });
      } else {
        setListingsError(data.error || 'Could not load listings.');
      }
    } catch (err) {
      console.error('Failed to fetch listings:', err);
      if (requestId === listingsRequest.current) {
        setListingsError('Failed to connect to server. Check your connection.');
      }
    } finally {
      if (requestId === listingsRequest.current) setIsListingsLoading(false);
    }
  }, [buildListingParams]);

  const loadMoreListings = useCallback(async () => {
    if (isLoadingMore || isListingsLoading || !listingMeta.hasMore) return;

    const requestId = listingsRequest.current; // a filter change makes this stale
    const nextPage = listingMeta.page + 1;
    setIsLoadingMore(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/listings?${buildListingParams(nextPage)}`
      );
      const data = await res.json();

      if (requestId !== listingsRequest.current) return;

      if (res.ok && data.success) {
        setListings((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          return [...prev, ...data.data.filter((item) => !seen.has(item.id))];
        });
        setListingMeta({
          page: nextPage,
          total: data.pagination.total,
          hasMore: data.pagination.has_more,
        });
      } else {
        showToast(data.error || 'Could not load more listings.', 'error');
      }
    } catch (err) {
      showToast('Could not load more listings. Check your connection.', 'error');
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    isListingsLoading,
    listingMeta,
    buildListingParams,
    showToast,
  ]);

  // Wait for the user to stop typing before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setApplied((prev) => {
        const next = {
          search: searchTerm.trim(),
          min: minPrice.trim(),
          max: maxPrice.trim(),
        };
        return prev.search === next.search &&
          prev.min === next.min &&
          prev.max === next.max
          ? prev
          : next;
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, minPrice, maxPrice]);

  // Infinite scroll: load the next page when the bottom comes into view
  useEffect(() => {
    const el = sentinelRef.current;

    if (
      !el ||
      activeTab !== 'browse' ||
      !listingMeta.hasMore ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreListings();
      },
      { rootMargin: '400px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab, listingMeta.hasMore, listings.length, loadMoreListings]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedCategory !== 'All' ||
    selectedCampus !== 'All' ||
    minPrice !== '' ||
    maxPrice !== '' ||
    sortBy !== 'newest';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedCampus('All');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
  };

  // ==================== FETCH SELLER LISTINGS ====================
  const fetchSellerListings = useCallback(async () => {
    const userId = currentUserId;
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
  }, [currentUserId, showToast]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);


  useEffect(() => {
    if (currentUserId) {
      fetchSellerListings();
    } else {
      setSellerListings([]);
    }
  }, [currentUserId, fetchSellerListings]);

  // Chat notifications now arrive through the live stream (see useChatStream below)

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
    localStorage.removeItem(ACTIVITY_KEY);

        setCurrentUser(null);
    setSellerListings([]);
    setEditingId(null);
    setActiveTab('browse');
    setFavoriteIds(new Set());
    setProfileSellerId(null);
    setChatModal({
      isOpen: false,
      sellerId: null,
      listingId: null,
      listingTitle: '',
      sellerName: '',
    });
    showToast('Logged out successfully', 'info');
  };

  // Idle timeout: wipe the session and reload so no account data stays in memory
  const handleIdleTimeout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem(ACTIVITY_KEY);

    try {
      sessionStorage.setItem('idleLogout', '1');
    } catch (err) {
      /* ignore */
    }

    window.location.reload();
  };

  // After an idle sign-out reload: explain what happened and offer sign-in.
  // Must stay ABOVE useIdleLogout: effects run in order, and this one has to
  // consume the flag before the idle check can set it again on a stale load.
  useEffect(() => {
    let flagged = false;
    try {
      flagged = sessionStorage.getItem('idleLogout') === '1';
      if (flagged) sessionStorage.removeItem('idleLogout');
    } catch (err) {
      /* ignore */
    }

    if (flagged) {
      showToast(
        'You were signed out after 30 minutes of inactivity. Please sign in again.',
        'info'
      );
      setAuthMode('login');
      setIsAuthModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    const { secondsLeft: idleSecondsLeft, stayActive } = useIdleLogout({
    enabled: !!currentUser,
    onTimeout: handleIdleTimeout,
  });

  // Ends the session when the server says it is no longer valid
  const forceLogout = useCallback(
    (message) => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem(ACTIVITY_KEY);
      setCurrentUser(null);
      setSellerListings([]);
      setEditingId(null);
      setActiveTab('browse');
      setFavoriteIds(new Set());
      setProfileSellerId(null);
      setChatModal({
        isOpen: false,
        sellerId: null,
        listingId: null,
        listingTitle: '',
        sellerName: '',
      });
      showToast(message, 'error', 6000);
    },
    [showToast]
  );

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
        } else if (data.code === 'ACCOUNT_SUSPENDED') {
          forceLogout(data.error);
        } else if (res.status === 401 || res.status === 403) {
          forceLogout('Your session has expired. Please sign in again.');
        }
      } catch (err) {
        console.error('Failed to refresh account:', err);
      }
    };

    refreshAccount();
  }, []);

  // ==================== LIVE CHAT + UNREAD COUNT ====================
  const refreshUnread = useCallback(async () => {
    const userId = currentUserId;
    if (!userId) return;

    try {
      const res = await fetch(`${API_BASE}/api/chat/unread/total/${userId}`, {
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();

      if (res.ok && data.success) setUnreadTotal(data.total_unread || 0);
    } catch (err) {
      /* the next refresh will catch up */
    }
  }, [currentUserId]);

  useEffect(() => {
    chatModalRef.current = chatModal;
  });

  const subscribeChat = useCallback((fn) => {
    chatListeners.current.add(fn);
    return () => chatListeners.current.delete(fn);
  }, []);

  const emitChat = useCallback((event, payload) => {
    chatListeners.current.forEach((fn) => {
      try {
        fn(event, payload);
      } catch (err) {
        console.error('Chat listener error:', err);
      }
    });
  }, []);

  const handleChatEvent = useCallback(
    (event, payload) => {
      emitChat(event, payload);

      const myId = Number(currentUserId);
      if (event !== 'message' || Number(payload.receiver_id) !== myId) return;

      const open = chatModalRef.current;
            if (
        open?.isOpen &&
        Number(open.sellerId) === Number(payload.sender_id) &&
        Number(open.listingId || 0) === Number(payload.listing_id || 0)
      ) {
        return; // the open chat window marks it as read
      }

      setUnreadTotal((n) => n + 1);
      playNotificationSound();

      if (
        document.visibilityState === 'hidden' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification('📩 New message on UniLnk', {
          body: `${payload.sender_name || 'A student'} sent you a message`,
          icon: '/favicon.ico',
        });
      }

            showToast(
        `📩 New message from ${payload.sender_name || 'a student'}${
          payload.listing_title ? ` about "${payload.listing_title}"` : ''
        }`,
        'info'
      );
    },
    [currentUserId, emitChat, showToast]
  );

  useChatStream({
    enabled: !!currentUser,
    onEvent: handleChatEvent,
    onOpen: refreshUnread,
    onAuthError: (status, body) => {
      forceLogout(
        body?.code === 'ACCOUNT_SUSPENDED'
          ? body.error
          : 'Your session has expired. Please sign in again.'
      );
    },
  });

  // Safety net: refresh the unread count now and then and when the tab returns
  useEffect(() => {
    if (!currentUserId) {
      setUnreadTotal(0);
      return undefined;
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    refreshUnread();
    const interval = setInterval(refreshUnread, 60000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshUnread();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentUserId, refreshUnread]);

  // ==================== SAVED LISTINGS (FAVOURITES) ====================
  useEffect(() => {
    if (!currentUserId) {
      setFavoriteIds(new Set());
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/favorites/ids`, {
          headers: { ...getAuthHeaders() },
        });
        const data = await res.json();
        if (res.ok && data.success) setFavoriteIds(new Set(data.ids));
      } catch (err) {
        /* hearts simply start empty */
      }
    })();
  }, [currentUserId]);

  const fetchSaved = useCallback(async () => {
    const mutationsAtStart = savedMutations.current;
    setIsSavedLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/favorites`, {
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();

      // A save/unsave happened while this was loading: its list is out of date
      if (mutationsAtStart !== savedMutations.current) return;

      if (res.ok && data.success) setSavedListings(data.data);
      else showToast(data.error || 'Could not load saved listings.', 'error');
    } catch (err) {
      showToast('Could not load saved listings. Check your connection.', 'error');
    } finally {
      setIsSavedLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeTab === 'saved' && currentUserId) fetchSaved();
  }, [activeTab, currentUserId, fetchSaved]);

  const toggleFavorite = async (item) => {
    const wasSaved = favoriteIds.has(item.id);
    savedMutations.current += 1;

    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    if (wasSaved) {
      setSavedListings((prev) => prev.filter((l) => l.id !== item.id));
    }

    try {
      const res = await fetch(`${API_BASE}/api/favorites/${item.id}`, {
        method: wasSaved ? 'DELETE' : 'POST',
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.error || 'failed');
    } catch (err) {
      // undo the optimistic change
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      showToast(
        err.message && err.message !== 'failed' && err.message !== 'Failed to fetch'
          ? err.message
          : 'Could not update your saved listings.',
        'error'
      );
    }
  };

  // Signed out in another tab -> sign out here too
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token' && !e.newValue) {
        setCurrentUser(null);
        setSellerListings([]);
        setEditingId(null);
        setActiveTab('browse');
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);


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

  // ==================== SELLER PROFILE ====================
  const handleViewSeller = (sellerId) => {
    if (!sellerId) {
      showToast('Seller information not available', 'error');
      return;
    }
    setProfileSellerId(sellerId);
  };

  // ==================== OPEN CHAT ====================
    const handleOpenChat = (
    sellerId,
    listingId,
    sellerName,
    requireLogin = false,
    listingTitle = ''
  ) => {
    if (requireLogin || !currentUser) {
      setAuthMode('login');
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
      listingTitle,
      sellerName: sellerName || 'Seller',
    });
  };

    const handleCloseChat = () => {
    setChatModal({
      isOpen: false,
      sellerId: null,
      listingId: null,
      listingTitle: '',
      sellerName: '',
    });
    refreshUnread();
  };

  // Called by the chat window after it marks messages as read
  const handleChatRead = useCallback(() => {
    refreshUnread();
    emitChat('read', {});
  }, [refreshUnread, emitChat]);

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
    const TabButton = ({ tab, label, icon, badge = 0 }) => (
    <button
      className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
      onClick={() => setActiveTab(tab)}
    >
      {icon && <span className="tab-icon">{icon}</span>}
      {label}
      {badge > 0 && (
        <span className="tab-badge" aria-label={`${badge} unread`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );

  const cardProps = (item) => ({
    item,
    currentUser,
    onOpenChat: handleOpenChat,
    onViewSeller: handleViewSeller,
    isFavorite: favoriteIds.has(item.id),
    onToggleFavorite: toggleFavorite,
    onReport: setReportTarget,
  });

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
              onClick={() => {
                setAuthMode('login');
                setIsAuthModalOpen(true);
              }}
            >
              Student Sign In
            </button>

            <span className="auth-prompt-text">or</span>

            <button
              className="auth-prompt-btn secondary"
              onClick={() => {
                setAuthMode('register');
                setIsAuthModalOpen(true);
              }}
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
                badge={unreadTotal}
              />
              <TabButton tab="saved" label="Saved" icon="♥" />

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

        {/* IDLE WARNING */}
        {currentUser && idleSecondsLeft !== null && (
          <IdleWarningModal
            secondsLeft={idleSecondsLeft}
            onStay={stayActive}
            onLogout={handleLogout}
          />
        )}

        {/* AUTH MODAL */}
        <AuthModal
        showToast={showToast}
          initialMode={authMode}
          resetToken={resetToken}
          onResetComplete={() => setResetToken('')}
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* CHAT MODAL */}
        <ChatModal
          isOpen={chatModal.isOpen}
          onClose={handleCloseChat}
          sellerId={chatModal.sellerId}
          sellerName={chatModal.sellerName}
          listingId={chatModal.listingId}
          listingTitle={chatModal.listingTitle}
          currentUser={currentUser}
          API_BASE={API_BASE}
          subscribe={subscribeChat}
                    onRead={handleChatRead}
          onViewProfile={handleViewSeller}
          onSwitchThread={(lid, title) =>
            handleOpenChat(
              chatModal.sellerId,
              lid,
              chatModal.sellerName,
              false,
              title
            )
          }
        />

        {/* SELLER PROFILE */}
        <SellerProfileModal
          sellerId={profileSellerId}
          onClose={() => setProfileSellerId(null)}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onOpenChat={handleOpenChat}
          onRequireLogin={() => {
            setProfileSellerId(null);
            setAuthMode('login');
            setIsAuthModalOpen(true);
          }}
          showToast={showToast}
        />

        {/* REPORT A LISTING */}
        <ReportModal
          item={reportTarget}
          onClose={() => setReportTarget(null)}
          showToast={showToast}
        />

        {/* ==================== BROWSE MARKETPLACE ==================== */}
        {activeTab === 'browse' && (
          <div className="tab-content">
            <div className="search-filters">
              <input
                type="text"
                placeholder="Search by title, description or course code..."
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
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
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

            <div className="search-filters search-filters-secondary">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
                aria-label="Sort listings"
              >
                <option value="newest">Newest first</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>

              <input
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Min price (ZMW)"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="price-input"
                aria-label="Minimum price"
              />

              <input
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Max price (ZMW)"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="price-input"
                aria-label="Maximum price"
              />

              {hasActiveFilters && (
                <button className="clear-filter-btn" onClick={clearFilters}>
                  ✕ Clear filters
                </button>
              )}
            </div>

            <p className="results-count" aria-live="polite">
              {isListingsLoading && listings.length === 0
                ? 'Loading listings...'
                : `${listingMeta.total} item${listingMeta.total === 1 ? '' : 's'} found`}
            </p>

            {listingsError && (
              <div className="adm-empty">
                <p>{listingsError}</p>
                <button className="adm-btn adm-btn-ghost" onClick={fetchListings}>
                  Try again
                </button>
              </div>
            )}

            <div className="listings-grid">
              {!listingsError &&
                !isListingsLoading &&
                listings.length === 0 && (
                  <p className="empty-state">
                    No listings found matching your criteria.
                  </p>
                )}

              {listings.map((item) => (
                <ListingCard key={item.id} {...cardProps(item)} />
              ))}
            </div>

            {listingMeta.hasMore && (
              <div className="load-more" ref={sentinelRef}>
                <button
                  className="adm-btn adm-btn-ghost"
                  onClick={loadMoreListings}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== MESSAGES ==================== */}
        {activeTab === 'messages' && currentUser && (
          <div className="tab-content">
                        <ChatInbox
              currentUser={currentUser}
              onOpenChat={handleOpenChat}
              API_BASE={API_BASE}
              subscribe={subscribeChat}
            />
          </div>
        )}

        {/* ==================== SAVED LISTINGS ==================== */}
        {activeTab === 'saved' && currentUser && (
          <div className="tab-content">
            <h2 className="section-title">Saved listings</h2>

            {isSavedLoading && savedListings.length === 0 ? (
              <p className="empty-state">Loading saved listings...</p>
            ) : savedListings.length === 0 ? (
              <p className="empty-state">
                You have not saved anything yet. Tap the ♡ on a listing to
                save it for later.
              </p>
            ) : (
              <div className="listings-grid">
                {savedListings.map((item) => (
                  <ListingCard key={item.id} {...cardProps(item)} />
                ))}
              </div>
            )}
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

              <button
                className="adm-btn adm-btn-ghost dashboard-profile-btn"
                onClick={() => setProfileSellerId(currentUser.id || currentUser.user?.id)}
              >
                👤 View my public profile
              </button>

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
                      const isRemoved = !!item.removed_at;
                      const showRed = isSold || isRemoved;

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
                                backgroundColor: showRed
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(16, 185, 129, 0.15)',
                                color: showRed
                                  ? '#FCA5A5'
                                  : THEME.emerald,
                                border: `1px solid ${
                                  showRed
                                    ? 'rgba(239, 68, 68, 0.35)'
                                    : 'rgba(16, 185, 129, 0.35)'
                                }`,
                              }}
                            >
                              {isRemoved ? 'REMOVED' : isSold ? 'SOLD' : 'ACTIVE'}
                            </span>

                            {isRemoved && (
                              <span className="removed-note">
                                Removed by moderators ({item.removed_reason}).
                                {item.removed_note
                                  ? ` Note: ${item.removed_note}.`
                                  : ''}{' '}
                                It is hidden from the marketplace and will be
                                deleted permanently after 30 days. If you
                                think this was a mistake, reply to the
                                moderators in Messages.
                              </span>
                            )}

                            {/* Sold notice */}
                            {isSold && !isRemoved && item.sold_at && (
                              <span
                                style={{
                                  display: 'block',
                                  marginTop: '6px',
                                  color: THEME.textMuted,
                                  fontSize: '12px',
                                  lineHeight: '1.5',
                                }}
                              >
                                Photos are deleted 5 days after a sale. The
                                sale stays in your sold history.
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
                                {!isSold && !isRemoved && (
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
                                {!isRemoved && (
                                  <button
                                    onClick={() => handleDeleteListing(item.id)}
                                    className="delete-btn"
                                  >
                                    Delete
                                  </button>
                                )}
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
