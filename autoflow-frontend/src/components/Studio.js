import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  addEdge, Background, Controls, applyEdgeChanges, applyNodeChanges, ReactFlowProvider, Handle, Position 
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Cpu, Mail, X, Zap, Globe, Activity, Send, 
  ShieldCheck, FileText, ChevronLeft 
} from 'lucide-react';

const ActionNode = ({ data, selected, type }) => {
  const isTrigger = type === 'input' || data.label.includes('Trigger') || data.label.includes('Google Forms');
  return (
    <div style={{ 
      padding: '12px', borderRadius: '10px', background: '#1D546D', color: '#E0F2FE', 
      border: selected ? '2px solid #38BDF8' : '1px solid #0EA5E9', 
      display: 'flex', alignItems: 'center', gap: '12px', minWidth: '190px',
      boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
    }}>
      {!isTrigger && <Handle type="target" position={Position.Top} style={{ background: '#38BDF8' }} />}
      {data.label.includes('Google Forms') && <FileText size={18} color="#A855F7" />} 
      {data.label.includes('AI') && <Cpu size={18} color="#7DD3FC" />}
      {data.label.includes('WhatsApp') && <MessageSquare size={18} color="#4ADE80" />}
      {data.label.includes('Gmail') && <Mail size={18} color="#F87171" />}
      {data.label.includes('HTTP') && <Globe size={18} color="#A78BFA" />}
      <span style={{ fontSize: '13px', fontWeight: '600' }}>{data.label}</span>
      <Handle type="source" position={Position.Bottom} style={{ background: '#38BDF8' }} />
    </div>
  );
};

const nodeTypes = { input: ActionNode, ai_node: ActionNode, whatsapp: ActionNode, gmail: ActionNode, http_node: ActionNode };

const AutoFlowApp = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [activeId, setActiveId] = useState(id !== 'new' ? id : null);
  const [workflowName, setWorkflowName] = useState("New Automation");

  // Load existing workflow data
  useEffect(() => {
    if (id && id !== 'new') {
      axios.get(`http://localhost:3000/api/workflows/${id}`)
        .then(res => {
          setNodes(res.data.nodes || []);
          setEdges(res.data.edges || []);
          setWorkflowName(res.data.name || "Untitled Flow");
          setActiveId(res.data._id);
        })
        .catch(err => console.error("Load failed", err));
    } else {
      setNodes([{ id: 'start_0', type: 'input', data: { label: 'Google Forms', targetUserEmail: '' }, position: { x: 250, y: 50 } }]);
    }
  }, [id]);

  const updateNodeData = (nodeId, field, value) => {
    setNodes((nds) => nds.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, [field]: value } } : node));
  };

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep', style: { stroke: '#38BDF8', strokeWidth: 2 } }, eds)), []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    const label = event.dataTransfer.getData('application/label');
    if (!reactFlowInstance) return;

    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setNodes((nds) => nds.concat({
      id: `node_${Date.now()}`,
      type,
      position,
      data: { label, instruction: '', toPhone: '', toEmail: '', url: '', targetUserEmail: '' }
    }));
  }, [reactFlowInstance]);

  const onActivate = async () => {
    try {
      const isExisting = id && id !== 'new';
      const method = isExisting ? 'put' : 'post';
      const url = isExisting ? `http://localhost:3000/api/workflows/${id}` : `http://localhost:3000/api/workflows`;

      const res = await axios[method](url, { name: workflowName, nodes, edges });
      const savedId = res.data._id || id;
      
      await axios.post(`http://localhost:3000/api/workflows/${savedId}/activate`);
      setActiveId(savedId);
      alert("🟢 AutoFlow is now LIVE!");
    } catch (err) { alert("Activation failed."); }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#061E29' }}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate('/')} style={backBtnStyle}><ChevronLeft size={20}/></button>
          <input 
            value={workflowName} 
            onChange={(e) => setWorkflowName(e.target.value)} 
            style={nameInputStyle}
          />
          {activeId && id !== 'new' && <div style={liveTagStyle}><Activity size={14} className="pulse"/> LIVE</div>}
        </div>
        <button onClick={onActivate} style={activateBtnStyle(activeId && id !== 'new')}>
          {activeId && id !== 'new' ? "UPDATE LIVE" : "GO LIVE"}
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex' }}>
        <aside style={sidebarContainerStyle}>
          <div style={categoryHeader}><Zap size={12}/> TRIGGERS</div>
          <SidebarItem label="Google Forms" type="input" color="#A855F7" />
          <SidebarItem label="HTTP Request" type="http_node" color="#A78BFA" />

          <div style={{...categoryHeader, marginTop: '20px'}}><Cpu size={12}/> INTELLIGENCE</div>
          <SidebarItem label="AI Node" type="ai_node" color="#7DD3FC" />

          <div style={{...categoryHeader, marginTop: '20px'}}><Send size={12}/> ACTIONS</div>
          <SidebarItem label="WhatsApp" type="whatsapp" color="#4ADE80" />
          <SidebarItem label="Gmail Node" type="gmail" color="#F87171" />
        </aside>

        <div style={{ flex: 1 }}>
          <ReactFlow 
            nodes={nodes} edges={edges} 
            onNodesChange={(c) => setNodes((n) => applyNodeChanges(c, n))} 
            onEdgesChange={(c) => setEdges((e) => applyEdgeChanges(c, e))} 
            onConnect={onConnect} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
            onNodeClick={(e, n) => setSelectedNodeId(n.id)} nodeTypes={nodeTypes} fitView
          >
            <Background color="#1D546D" variant="dots" /><Controls />
          </ReactFlow>
        </div>

        {selectedNode && (
           <aside style={configSidebarStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: 'white' }}>Configure {selectedNode.data.label}</h3>
                <X size={20} onClick={() => setSelectedNodeId(null)} style={{ cursor: 'pointer', color: '#64748B' }} />
              </div>

              {selectedNode.data.label.includes('Google Forms') && (
                <div style={configSection}>
                  <p style={subLabel}><ShieldCheck size={12}/> APPS SCRIPT TARGET</p>
                  <input style={inputStyle} value={selectedNode.data.targetUserEmail || ''} onChange={(e) => updateNodeData(selectedNodeId, 'targetUserEmail', e.target.value)} placeholder="Email filter..." />
                </div>
              )}

              {selectedNode.data.label.includes('AI') && (
                <div style={configSection}>
                  <p style={subLabel}>PROMPT INSTRUCTION</p>
                  <textarea style={inputStyle} rows="6" value={selectedNode.data.instruction || ''} onChange={(e) => updateNodeData(selectedNodeId, 'instruction', e.target.value)} placeholder="Tell Gemini what to do..." />
                </div>
              )}

              {selectedNode.data.label.includes('WhatsApp') && (
                <div style={configSection}>
                  <p style={subLabel}>PHONE NUMBER</p>
                  <input style={inputStyle} value={selectedNode.data.toPhone || ''} onChange={(e) => updateNodeData(selectedNodeId, 'toPhone', e.target.value)} placeholder="+91..." />
                </div>
              )}

              {selectedNode.data.label.includes('Gmail') && (
                <div style={configSection}>
                  <p style={subLabel}>RECIPIENT EMAIL</p>
                  <input style={inputStyle} value={selectedNode.data.toEmail || ''} onChange={(e) => updateNodeData(selectedNodeId, 'toEmail', e.target.value)} placeholder="example@gmail.com" />
                </div>
              )}
           </aside>
        )}
      </div>
    </div>
  );
};

const SidebarItem = ({ label, type, color }) => (
  <div onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', type); e.dataTransfer.setData('application/label', label); }} draggable style={{...sidebarStyle, borderLeft: `4px solid ${color}`}}>{label}</div>
);

// --- Styling ---
const headerStyle = { height: '65px', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 25px', borderBottom: '1px solid #1E293B' };
const nameInputStyle = { background: 'none', border: 'none', color: 'white', fontSize: '18px', fontWeight: 'bold', outline: 'none', width: '250px' };
const backBtnStyle = { background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' };
const liveTagStyle = { color: '#34D399', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', background: '#064E3B', padding: '4px 10px', borderRadius: '20px' };
const activateBtnStyle = (active) => ({ background: active ? '#10B981' : '#0EA5E9', color: 'white', padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' });
const sidebarContainerStyle = { width: '240px', padding: '20px', background: '#0B2E3C', borderRight: '1px solid #1E293B' };
const sidebarStyle = { padding: '12px', background: '#061E29', color: 'white', borderRadius: '8px', marginBottom: '8px', cursor: 'grab', fontSize: '13px', fontWeight: '600' };
const categoryHeader = { color: '#64748B', fontSize: '10px', fontWeight: '800', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' };
const configSidebarStyle = { width: '380px', padding: '30px', background: '#0B2E3C', borderLeft: '1px solid #1E293B', overflowY: 'auto' };
const configSection = { marginBottom: '20px' };
const subLabel = { fontSize: '10px', color: '#94A3B8', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' };
const inputStyle = { width: '100%', padding: '12px', background: '#020617', color: 'white', border: '1px solid #334155', borderRadius: '6px', outline: 'none' };

const Studio = () => (<ReactFlowProvider><AutoFlowApp /></ReactFlowProvider>);
export default Studio;