import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Activity, Plus, Power, LayoutGrid, Trash2, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. Fetch Workflows
  const fetchWorkflows = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/workflows');
      setWorkflows(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Fetch Error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  // 2. Stop Workflow (Deactivate)
  const handleStop = async (id) => {
    try {
      await axios.post(`http://localhost:3000/api/workflows/${id}/deactivate`);
      alert("🛑 Automation Stopped");
      fetchWorkflows(); // Refresh list
    } catch (err) {
      alert("Failed to stop workflow");
    }
  };

  // 3. Delete Workflow
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this workflow?")) {
      try {
        await axios.delete(`http://localhost:3000/api/workflows/${id}`);
        setWorkflows(workflows.filter(w => w._id !== id));
      } catch (err) {
        alert("Delete failed");
      }
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0 }}>AutoFlow <span style={{color: '#38BDF8'}}>CLOUD</span></h1>
          <p style={{ color: '#64748B', fontSize: '14px' }}>Welcome back, Rony. Manage your platform.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchWorkflows} style={refreshBtnStyle}><RefreshCw size={18} /></button>
          <button onClick={() => navigate('/studio/new')} style={createBtnStyle}>
            <Plus size={18} /> NEW WORKFLOW
          </button>
        </div>
      </header>

      <div style={statsRowStyle}>
        <div style={statBox}><span>Total Flows</span> <strong>{workflows.length}</strong></div>
        <div style={statBox}><span>Active Nodes</span> <strong style={{color: '#34D399'}}>{loading ? '...' : workflows.length}</strong></div>
      </div>

      <div style={gridStyle}>
        {workflows.map((flow) => (
          <div key={flow._id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <LayoutGrid size={20} color="#38BDF8" />
              <div style={statusTag}><Activity size={10} /> LIVE</div>
            </div>
            <h3 style={{ margin: '0 0 10px 0' }}>{flow.name || "Untitled Flow"}</h3>
            <p style={{ fontSize: '11px', color: '#64748B', marginBottom: '15px' }}>ID: {flow._id.substring(0, 8)}...</p>
            
            <div style={cardActions}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={() => navigate(`/studio/${flow._id}`)} style={editBtn}>OPEN STUDIO</button>
                <button onClick={() => handleDelete(flow._id)} style={deleteBtn}><Trash2 size={14}/></button>
              </div>
              <button onClick={() => handleStop(flow._id)} style={stopBtn}><Power size={14} /> STOP LIVE</button>
            </div>
          </div>
        ))}
      </div>
      {workflows.length === 0 && !loading && <p style={{textAlign: 'center', color: '#64748B', marginTop: '50px'}}>No workflows found. Create your first one!</p>}
    </div>
  );
};

// --- Professional Dark UI Styles ---
const containerStyle = { padding: '40px', background: '#061E29', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' };
const createBtnStyle = { background: '#0EA5E9', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const refreshBtnStyle = { background: '#1E293B', color: 'white', border: '1px solid #334155', padding: '12px', borderRadius: '8px', cursor: 'pointer' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' };
const cardStyle = { background: '#0B2E3C', padding: '25px', borderRadius: '15px', border: '1px solid #1E293B', transition: '0.3s' };
const statusTag = { background: '#064E3B', color: '#34D399', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' };
const statsRowStyle = { display: 'flex', gap: '20px', marginBottom: '30px' };
const statBox = { background: '#020617', padding: '15px 25px', borderRadius: '10px', border: '1px solid #1E293B', display: 'flex', flexDirection: 'column', minWidth: '150px' };
const cardActions = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1E293B', paddingTop: '15px', marginTop: '15px' };
const editBtn = { background: 'none', border: 'none', color: '#38BDF8', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };
const deleteBtn = { background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' };
const stopBtn = { background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' };

export default Dashboard;