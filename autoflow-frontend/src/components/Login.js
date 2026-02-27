import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE_URL = "https://autoflow-caor.onrender.com/api";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      localStorage.setItem('af_token', res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div style={{ padding: '60px', maxWidth: '420px', margin: '0 auto', color: '#fff' }}>
      <h2>Sign in to AutoFlow PRO</h2>
      {error && <div style={{ background: '#be123c', padding: '10px', borderRadius: '6px' }}>{error}</div>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" style={{ padding: '10px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px' }}>Login</button>
      </form>
      <p style={{ marginTop: '20px' }}>New? <Link to="/register" style={{ color: '#38bdf8' }}>Create an account</Link></p>
    </div>
  );
};

export default Login;
