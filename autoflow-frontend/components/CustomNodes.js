import React from 'react';
import { Handle, Position } from 'reactflow';
import { Cpu, Mail, MessageSquare } from 'lucide-react';

const nodeStyle = {
  padding: '10px',
  borderRadius: '8px',
  background: '#fff',
  border: '1px solid #cbd5e1',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  minWidth: '150px',
};

// This creates a node with an input hole on top and output hole on bottom
export const ActionNode = ({ data, selected }) => {
  return (
    <div style={{ ...nodeStyle, border: selected ? '2px solid #6366f1' : '1px solid #cbd5e1' }}>
      <Handle type="target" position={Position.Top} style={{ background: '#94a3b8' }} />
      
      {data.label.includes('AI') && <Cpu size={16} color="#6366f1" />}
      {data.label.includes('Gmail') && <Mail size={16} color="#ef4444" />}
      {data.label.includes('WhatsApp') && <MessageSquare size={16} color="#22c55e" />}
      
      <span style={{ fontSize: '12px', fontWeight: '500' }}>{data.label}</span>
      
      <Handle type="source" position={Position.Bottom} style={{ background: '#94a3b8' }} />
    </div>
  );
};