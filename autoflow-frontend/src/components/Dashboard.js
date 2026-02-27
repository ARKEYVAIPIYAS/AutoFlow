import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Activity, Plus, Power, LayoutGrid, Trash2, RefreshCw, AlertCircle } from 'lucide-react';

// --- CONFIGURATION ---
// SUCCESSFULLY SWAPPED: This now points to your live Render engine
const API_BASE_URL = "https://autoflow-i36g.onrender.com/api";

const Dashboard = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // authentication helper
  const token = localStorage.getItem('af_token');
  if (!token) {
    navigate('/login');
  }

  // 1. Fetch Workflows from Render
  const fetchWorkflows = useCallback(async (showSilence = false) => {
    if (!showSilence) setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/workflows`, { headers: { Authorization: `Bearer ${token}` } });
      setWorkflows(res.data);
    } catch (err) {
      console.error("Cloud Fetch Error:", err);
      setError("Unable to reach Cloud Engine. Check your Render dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Real-Time Sync (Syncs with MongoDB Atlas every 30s)
  useEffect(() => {
    fetchWorkflows();
    const interval = setInterval(() => fetchWorkflows(true), 30000); 
    return () => clearInterval(interval);
  }, [fetchWorkflows]);

  // 3. Stop Workflow on Cloud
  const handleStop = async (id) => {
    try {
      await axios.post(`${API_BASE_URL}/workflows/${id}/deactivate`, null, { headers: { Authorization: `Bearer ${token}` } });
      fetchWorkflows(true); 
    } catch (err) {
      alert("Failed to halt cloud task.");
    }
  };

  // 4. Delete Workflow from MongoDB Atlas
  const handleDelete = async (id) => {
    if (window.confirm("Permanent Action: Delete this workflow from the cloud?")) {
      try {
        await axios.delete(`${API_BASE_URL}/workflows/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        setWorkflows(prev => prev.filter(w => w._id !== id));
      } catch (err) {
        alert("Delete failed. Cloud resource may be busy.");
      }
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: '26px', margin: 0, letterSpacing: '-1px' }}>
            AutoFlow <span style={{color: '#38BDF8', fontWeight: '800'}}>PRO</span>
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '14px', marginTop: '4px' }}>
            {workflows.length} active automations on MongoDB Atlas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => fetchWorkflows()} 
            style={refreshBtnStyle}
            title="Force Cloud Sync"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => navigate('/studio/new')} style={createBtnStyle}>
            <Plus size={18} /> NEW WORKFLOW
          </button>
        </div>
      </header>

      {error && (
        <div style={errorBanner}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div style={statsRowStyle}>
        <div style={statBox}>
          <span style={statLabel}>CLOUD REPOSITORY</span> 
          <strong style={statValue}>{workflows.length}</strong>
        </div>
        <div style={statBox}>
          <span style={statLabel}>ENGINE STATUS</span> 
          <strong style={{...statValue, color: '#34D399'}}>
            {loading ? 'SYNCING...' : 'ONLINE'}
          </strong>
        </div>
      </div>

      <div style={gridStyle}>
        {workflows.map((flow) => (
          <div key={flow._id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div style={iconBox}><LayoutGrid size={20} color="#38BDF8" /></div>
              <div style={statusTag}><Activity size={10} /> LIVE</div>
            </div>
            <h3 style={cardTitle}>{flow.name || "Unnamed Automation"}</h3>
            <p style={cardId}>Deployment ID: {flow._id.substring(0, 12)}</p>
            
            <div style={cardActions}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={() => navigate(`/studio/${flow._id}`)} style={editBtn}>OPEN STUDIO</button>
                <button onClick={() => handleDelete(flow._id)} style={deleteBtn}><Trash2 size={16}/></button>
              </div>
              <button onClick={() => handleStop(flow._id)} style={stopBtn}>
                <Power size={14} /> STOP
              </button>
            </div>
          </div>
        ))}
      </div>

      {workflows.length === 0 && !loading && (
        <div style={emptyState}>
           <p>Your cloud database is currently empty.</p>
           <button onClick={() => navigate('/studio/new')} style={emptyBtn}>Launch your first automation</button>
        </div>
      )}
    </div>
  );
};

// --- Styles ---
const containerStyle = { padding: '50px 80px', background: '#020617', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' };
const createBtnStyle = { background: '#0EA5E9', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px 0 rgba(14, 165, 233, 0.39)' };
const refreshBtnStyle = { background: '#1E293B', color: '#94A3B8', border: '1px solid #334155', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: '0.2s' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' };
const cardStyle = { background: '#0F172A', padding: '30px', borderRadius: '20px', border: '1px solid #1E293B', position: 'relative', overflow: 'hidden' };
const iconBox = { background: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: '12px' };
const statusTag = { background: 'rgba(52, 211, 153, 0.1)', color: '#34D399', padding: '6px 12px', borderRadius: '30px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(52, 211, 153, 0.2)' };
const cardTitle = { fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0', color: '#F1F5F9' };
const cardId = { fontSize: '12px', color: '#64748B', fontFamily: 'monospace', marginBottom: '20px' };
const statsRowStyle = { display: 'flex', gap: '20px', marginBottom: '40px' };
const statBox = { background: '#0F172A', padding: '20px 30px', borderRadius: '16px', border: '1px solid #1E293B', flex: 1 };
const statLabel = { color: '#64748B', fontSize: '11px', fontWeight: '800', letterSpacing: '1px', display: 'block', marginBottom: '5px' };
const statValue = { fontSize: '28px', fontWeight: '800' };
const cardActions = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1E293B', paddingTop: '20px', marginTop: '10px' };
const editBtn = { background: 'none', border: 'none', color: '#38BDF8', cursor: 'pointer', fontSize: '13px', fontWeight: '700' };
const deleteBtn = { background: 'none', border: 'none', color: '#475569', cursor: 'pointer', transition: '0.2s' };
const stopBtn = { background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)', color: '#F87171', cursor: 'pointer', fontSize: '12px', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' };
const errorBanner = { background: '#450a0a', border: '1px solid #991b1b', color: '#f87171', padding: '12px 20px', borderRadius: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' };
const emptyState = { textAlign: 'center', padding: '100px 0', color: '#64748B' };
const emptyBtn = { color: '#38BDF8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '16px', fontWeight: '600' };

export default Dashboard;