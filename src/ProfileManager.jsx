import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ProfileManager({ apiBase, authHeaders, onClose, onSaved, onViewPublic, PhotoViewer }) {
  const dialogRef = useRef(null);
  const previewRef = useRef('');
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ full_name: '', bio: '', campus: '', programme: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [viewPhoto, setViewPhoto] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [loadVersion, setLoadVersion] = useState(0);
  useEffect(() => {
    const dialog = dialogRef.current;
    const focused = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; focused?.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/auth/me`, { headers: authHeaders(), signal: controller.signal })
      .then(async (res) => { const body = await res.json(); if (!res.ok) throw new Error(body.error || 'Unable to load profile'); return body.user; })
      .then((account) => {
        setUser(account);
        setForm({full_name: account.full_name || '', bio: account.bio || '', campus: account.campus || '', programme: account.programme || ''});
        setError('');
      }).catch((err) => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
  }, [apiBase, authHeaders, loadVersion]);
  const chooseFile = (selected) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = selected ? URL.createObjectURL(selected) : '';
    setFile(selected); setPreview(previewRef.current);
    if (!selected && fileInputRef.current) fileInputRef.current.value = '';
  };
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);
  useEffect(() => { if (error || notice) dialogRef.current?.scrollTo({top:0,behavior:'smooth'}); }, [error,notice]);
  const request = async (path, options, message) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch(`${apiBase}${path}`, { ...options, headers: { ...authHeaders(), ...options.headers } });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || 'Unable to save changes');
      if (body.user) { setUser(body.user); onSaved(body.user); }
      setNotice(message); return true;
    } catch (err) { setError(err.message); return false; }
    finally { setBusy(false); }
  };
  const savePhoto = async () => {
    if (!file) return;
    const data = new FormData(); data.append('avatar', file);
    if (await request('/api/profile/avatar', {method:'POST',body:data}, 'Profile photo updated.')) chooseFile(null);
  };
  return createPortal(<dialog ref={dialogRef} className="account-profile-dialog" aria-labelledby="account-profile-title"
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="account-profile-header"><div><h2 id="account-profile-title">My profile</h2><p>Your identity on UniLnk</p></div>
      <button type="button" disabled={busy} onClick={onClose} aria-label="Close profile management">✕</button></header>
    {error && <p className="account-profile-error" role="alert">{error}</p>}
    {notice && <p className="account-profile-notice" role="status">{notice}</p>}
    {!user ? <p>{error ? <button onClick={() => setLoadVersion((v) => v + 1)}>Try again</button> : 'Loading your profile…'}</p> : <>
      <section className="account-profile-section"><h3>Profile photo</h3>
        <div className="account-profile-photo-row">
          <button type="button" className="account-profile-avatar" disabled={!user.avatar_url || busy || !!file} onClick={() => setViewPhoto(true)} aria-label="View profile photo full size">
            {preview || user.avatar_url ? <img src={preview || user.avatar_url} alt="Your profile" /> : user.full_name.charAt(0)}
          </button>
          <div><label>Choose photo<input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
            onChange={(event) => { const selected = event.target.files[0]; setError('');
              if (selected && (!['image/jpeg','image/png','image/webp'].includes(selected.type) || selected.size > 5*1024*1024)) {
                setError('Choose a JPG, PNG or WebP photo up to 5 MB.'); event.target.value=''; chooseFile(null); return;
              } chooseFile(selected || null);
            }} /></label><p>JPG, PNG or WebP · up to 5 MB. Tap your saved photo to enlarge it.</p>
            <div className="account-profile-actions"><button disabled={!file || busy} onClick={savePhoto}>Upload photo</button>
              {file && <button disabled={busy} onClick={() => chooseFile(null)}>Cancel selection</button>}
              {user.avatar_url && <button disabled={busy} onClick={async () => {
                if (await request('/api/profile/avatar',{method:'DELETE'},'Profile photo removed.')) chooseFile(null);
              }}>Remove photo</button>}</div></div>
        </div>
      </section>
      <form className="account-profile-section" onSubmit={(event) => {event.preventDefault(); request('/api/profile',{
        method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)},'Profile saved.');}}>
        <h3>Public information</h3><p>Other students can see these details on your seller profile.</p>
        <fieldset disabled={busy}>
          <label>Full name<input required minLength={2} maxLength={100} value={form.full_name} onChange={(e) => setForm({...form,full_name:e.target.value})} autoComplete="name" /></label>
          <label>Bio<textarea maxLength={500} rows={3} placeholder="Tell other students a little about yourself" value={form.bio} onChange={(e) => setForm({...form,bio:e.target.value})} /><small>{form.bio.length}/500</small></label>
          <div className="account-profile-grid"><label>Campus<select value={form.campus} onChange={(e) => setForm({...form,campus:e.target.value})}>
            <option value="">Prefer not to share</option><option>Silverest Main Campus</option><option>Pioneer Campus</option><option>Mass Media Campus</option></select></label>
            <label>Programme / course<input maxLength={120} value={form.programme} onChange={(e) => setForm({...form,programme:e.target.value})} placeholder="Optional" /></label></div>
          <button type="submit">{busy ? 'Please wait…' : 'Save profile'}</button>
        </fieldset>
      </form>
      <section className="account-profile-section"><h3>Private account details</h3><p>Email: {user.email}</p><p>Student ID: {user.student_id || 'Not set'}</p><small>Your email and student ID are hidden from public profiles. Verification details cannot be edited here.</small></section>
      <form className="account-profile-section" onSubmit={async (event) => {event.preventDefault();
        if (passwords.next!==passwords.confirm) {setError('New passwords do not match.');setNotice('');return;}
        if (await request('/api/profile/password',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({current_password:passwords.current,new_password:passwords.next})},'Password changed. Use the new password next time you sign in.')) setPasswords({current:'',next:'',confirm:''});
      }}><h3>Change password</h3><p>At least 8 characters, including uppercase, lowercase, a number and a symbol.</p><fieldset disabled={busy}>
        <label>Current password<input type="password" required autoComplete="current-password" value={passwords.current} onChange={(e) => setPasswords({...passwords,current:e.target.value})} /></label>
        <label>New password<input type="password" required minLength={8} autoComplete="new-password" value={passwords.next} onChange={(e) => setPasswords({...passwords,next:e.target.value})} /></label>
        <label>Confirm new password<input type="password" required minLength={8} autoComplete="new-password" value={passwords.confirm} onChange={(e) => setPasswords({...passwords,confirm:e.target.value})} /></label>
        <button type="submit">Change password</button></fieldset>
      </form>
      <button type="button" disabled={busy} onClick={() => onViewPublic(user.id)}>View my public profile →</button>
      {viewPhoto && user.avatar_url && <PhotoViewer images={[user.avatar_url]} initialIndex={0} title={`${user.full_name}'s profile photo`} onClose={() => setViewPhoto(false)} />}
    </>}
  </dialog>, document.body);
}

