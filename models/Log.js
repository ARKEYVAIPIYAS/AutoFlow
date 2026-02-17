const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' },
    workflowName: String,
    status: { type: String, enum: ['Success', 'Failed'] },
    inputData: Object,
    aiResponse: String,
    error: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema);