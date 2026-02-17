const mongoose = require('mongoose');

const WorkflowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // Explicitly define nodes as an array of OBJECTS
  nodes: [{
    id: { type: String, required: true },
    type: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
  }],
  // Explicitly define edges as an array of OBJECTS
  edges: [{
    source: { type: String, required: true },
    target: { type: String, required: true }
  }]
});

module.exports = mongoose.model('Workflow', WorkflowSchema);