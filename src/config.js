const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://unilnk-backend.onrender.com';

export default API_BASE;