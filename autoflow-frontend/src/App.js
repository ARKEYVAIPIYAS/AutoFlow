import React, { useState, useCallback } from 'react';
import ReactFlow, { 
  addEdge, Background, Controls, applyEdgeChanges, applyNodeChanges, ReactFlowProvider, Handle, Position 
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { MessageSquare, Cpu, Mail, X, Zap, Globe, Activity, Send, ShieldCheck, Info, FileText } from 'lucide-react';

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
      {data.label.includes('Trigger') && <Zap size={18} color="#FCD34D" fill="#FCD34D" />} 
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
  // Updated initial state to start with the Google Forms node
  const [nodes, setNodes] = useState([{ id: 'start_0', type: 'input', data: { label: 'Google Forms', targetUserEmail: '' }, position: { x: 250, y: 50 } }]);
  const [edges, setEdges] = useState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const updateNodeData = (id, field, value) => {
    setNodes((nds) => nds.map((node) => node.id === id ? { ...node, data: { ...node.data, [field]: value } } : node));
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

  const onDeploy = async () => {
    try {
      const res = await axios.post('http://localhost:3000/api/workflows', { name: `Manual_${Date.now()}`, nodes, edges });
      await axios.post(`http://localhost:3000/api/workflows/${res.data._id}/run`);
      alert("🚀 Single Run Triggered!");
    } catch (err) { alert("Run failed."); }
  };

  const onActivate = async () => {
    try {
      const saveRes = await axios.post('http://localhost:3000/api/workflows', { 
        name: `Live_${Date.now()}`, nodes, edges 
      });
      const newId = saveRes.data._id;
      await axios.post(`http://localhost:3000/api/workflows/${newId}/activate`);
      setActiveId(newId);
      alert("🟢 AutoFlow is now LIVE!");
    } catch (err) { alert("Activation failed."); }
  };

  const onDeactivate = async () => {
    try {
      if (activeId) {
        await axios.post(`http://localhost:3000/api/workflows/${activeId}/deactivate`);
        setActiveId(null);
        alert("🛑 Polling Stopped.");
      }
    } catch (err) { alert("Deactivation failed."); }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#061E29' }}>
      <header style={{ height: '65px', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 25px', borderBottom: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ color: 'white', margin: 0, fontSize: '20px' }}>AutoFlow <span style={{color: '#38BDF8'}}>STUDIO</span></h2>
          {activeId && <div style={{ color: '#34D399', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}><Activity size={14} className="pulse"/> LIVE</div>}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onDeploy} style={{ background: '#1E293B', color: 'white', padding: '8px 15px', borderRadius: '6px', border: '1px solid #334155', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={14} /> RUN ONCE
          </button>
          {activeId ? (
            <button onClick={onDeactivate} style={{ background: '#EF4444', color: 'white', padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>STOP LIVE</button>
          ) : (
            <button onClick={onActivate} style={{ background: '#0EA5E9', color: 'white', padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>GO LIVE</button>
          )}
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex' }}>
        <aside style={{ width: '220px', padding: '20px', background: '#0B2E3C', borderRight: '1px solid #1E293B' }}>
          <p style={{ color: '#64748B', fontSize: '11px', marginBottom: '15px' }}>DRAG NODES TO CANVAS</p>
          {/* Added Google Forms back to the sidebar */}
          <div onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'input'); e.dataTransfer.setData('application/label', 'Google Forms'); }} draggable style={sidebarStyle}>Google Forms</div>
          <div onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'http_node'); e.dataTransfer.setData('application/label', 'HTTP Request'); }} draggable style={sidebarStyle}>HTTP Request</div>
          <div onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'ai_node'); e.dataTransfer.setData('application/label', 'AI Node'); }} draggable style={sidebarStyle}>AI Node</div>
          <div onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'whatsapp'); e.dataTransfer.setData('application/label', 'WhatsApp'); }} draggable style={sidebarStyle}>WhatsApp</div>
          <div onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'gmail'); e.dataTransfer.setData('application/label', 'Gmail Node'); }} draggable style={sidebarStyle}>Gmail Node</div>
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
          <aside style={{ width: '380px', padding: '30px', background: '#0B2E3C', borderLeft: '1px solid #1E293B', color: 'white', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Configure {selectedNode.data.label}</h3>
                <X size={20} onClick={() => setSelectedNodeId(null)} style={{ cursor: 'pointer', color: '#64748B' }} />
            </div>
            
            <div style={{ marginTop: '25px' }}>
                {(selectedNode.data.label.includes('Google Forms') || selectedNode.data.label.includes('Trigger')) && (
                  <div style={configBoxStyle}>
                    <p style={{ color: '#38BDF8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}><ShieldCheck size={14}/> Apps Script Code</p>
                    <textarea 
                      readOnly 
                      style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '10px', height: '180px', background: '#020617' }} 
                      value={`function onFormSubmit(e) {
  var url = "YOUR_NGROK_URL/api/forms/bakery-order"; 
  var payload = {
    "customerName": e.values[1],
    "customerEmail": e.values[2],
    "customerPhone": e.values[3],
    "workflowId": "${activeId || 'SAVE_WORKFLOW_FIRST'}"
  };
  UrlFetchApp.fetch(url, {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  });
}`}
                    />
                    <label style={labelStyle}>TARGET EMAIL (FILTER)</label>
                    <input style={inputStyle} placeholder="puski@example.com" value={selectedNode.data.targetUserEmail || ''} onChange={(e) => updateNodeData(selectedNode.id, 'targetUserEmail', e.target.value)} />
                  </div>
                )}
                {/* ... other node config checks ... */}
                {selectedNode.data.label.includes('HTTP') && (
                  <input style={inputStyle} placeholder="https://api..." value={selectedNode.data.url} onChange={(e) => updateNodeData(selectedNode.id, 'url', e.target.value)} />
                )}
                {selectedNode.data.label.includes('AI') && (
                  <textarea style={inputStyle} rows="8" placeholder="Hello {{name}}..." value={selectedNode.data.instruction} onChange={(e) => updateNodeData(selectedNode.id, 'instruction', e.target.value)} />
                )}
                {selectedNode.data.label.includes('WhatsApp') && (
                  <input style={inputStyle} placeholder="+91..." value={selectedNode.data.toPhone} onChange={(e) => updateNodeData(selectedNode.id, 'toPhone', e.target.value)} />
                )}
                {selectedNode.data.label.includes('Gmail') && (
                  <input style={inputStyle} placeholder="example@gmail.com" value={selectedNode.data.toEmail} onChange={(e) => updateNodeData(selectedNode.id, 'toEmail', e.target.value)} />
                )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

const sidebarStyle = { padding: '12px', background: '#1D546D', color: 'white', borderRadius: '8px', marginBottom: '10px', cursor: 'grab', textAlign: 'center', fontWeight: '600', fontSize: '13px' };
const configBoxStyle = { background: '#061E29', padding: '15px', borderRadius: '8px', border: '1px solid #1E293B', marginBottom: '20px' };
const inputStyle = { width: '100%', padding: '12px', marginTop: '8px', marginBottom: '15px', background: '#020617', color: 'white', border: '1px solid #334155', borderRadius: '6px', outline: 'none' };
const labelStyle = { fontSize: '11px', color: '#94A3B8', fontWeight: 'bold', letterSpacing: '0.5px' };

export default () => (<ReactFlowProvider><AutoFlowApp /></ReactFlowProvider>);