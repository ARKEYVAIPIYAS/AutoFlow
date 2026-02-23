const path = require('path');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const axios = require('axios');
const cors = require('cors');
const cron = require('node-cron');
const helmet = require('helmet'); // New: Security headers
const compression = require('compression'); // New: Data compression

const Workflow = require('./models/Workflow');

const app = express();

// --- MIDDLEWARE ---
app.use(helmet()); // Protects your API headers
app.use(compression()); // Makes responses faster
app.use(cors()); 
app.use(express.json());

// --- PRODUCTION GUARDRAILS ---
const requiredEnv = ['MONGO_URI', 'GEMINI_KEY', 'GMAIL_USER', 'GMAIL_PASS'];
requiredEnv.forEach(key => {
    if (!process.env[key]) {
        console.warn(`\x1b[33m[Critical Warning]\x1b[0m ${key} is missing! Engine may fail.`);
    }
});

// --- CLOUD DATABASE CONNECTION ---
const dbURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aautoflow';

mongoose.connect(dbURI, { autoIndex: true })
    .then(() => {
        const dbType = process.env.MONGO_URI ? "MongoDB Atlas (Cloud)" : "Local MongoDB";
        console.log(`\x1b[32m[DB]\x1b[0m Connected to ${dbType} successfully`);
    })
    .catch(err => console.error("\x1b[31m[DB Error]\x1b[0m Connection failed:", err));

// --- GLOBAL TRACKER FOR ACTIVE POLLING ---
const activeTasks = {}; 

// --- THE RECURSIVE ENGINE ---
async function runEngine(workflow, initialData, mode = "Manual") {
    let context = { ...initialData, aiResponse: "", externalData: "" };
    const visited = new Set();

    const modeColors = { "Polling": "\x1b[36m", "RunOnce": "\x1b[33m", "Trigger": "\x1b[35m" };
    const color = modeColors[mode] || "\x1b[37m";
    
    // Enhanced Logging: Shows the specific target of the automation
    console.log(`${color}[${mode.toUpperCase()}] >> Executing: "${workflow.name}" for ${context.name || 'System'}\x1b[0m`);

    async function executeNode(nodeId) {
        if (visited.has(nodeId)) return;
        const currentNode = workflow.nodes.find(n => n.id === nodeId);
        if (!currentNode || !currentNode.data) return;
        visited.add(nodeId);

        console.log(`\x1b[90m   [Node]\x1b[0m Executing ${currentNode.data.label}`);

        try {
            // 1. TRIGGER NODE (Filtering logic)
            if (currentNode.data.label.includes('Google Form') || currentNode.data.label.includes('Trigger')) {
                const targetEmail = currentNode.data.targetUserEmail; 
                if (targetEmail && context.email && context.email !== targetEmail) {
                    console.log(`\x1b[31m      └─ GATEKEEPER: Identity Mismatch. Stopping Flow.\x1b[0m`);
                    return; 
                }
            }

            // 2. AI NODE (Gemini 2.5 Flash)
            if (currentNode.data.label.includes('AI')) {
                const apiURL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_KEY}`;
                let prompt = currentNode.data.instruction || "Context:";
                
                if (context.name) prompt = prompt.replace('{{name}}', context.name);
                if (context.email) prompt = prompt.replace('{{email}}', context.email);
                
                const response = await axios.post(apiURL, {
                    contents: [{ parts: [{ text: prompt }] }]
                }, { timeout: 15000 }); // 15s timeout for AI response
                
                context.aiResponse = response.data.candidates[0].content.parts[0].text;
                console.log("\x1b[32m      └─ AI: Generation Successful\x1b[0m");
            }

            // 3. WHATSAPP NODE (Twilio)
            if (currentNode.data.label.includes('WhatsApp') && context.aiResponse) {
                const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
                const recipient = (context.phone || currentNode.data.toPhone).replace(/[^\d+]/g, ''); 
                await client.messages.create({
                    from: `whatsapp:${process.env.TWILIO_PHONE}`,
                    to: `whatsapp:${recipient}`,
                    body: context.aiResponse.substring(0, 1500)
                });
                console.log(`\x1b[32m      └─ WhatsApp: Message delivered to ${recipient}\x1b[0m`);
            }

            // 4. GMAIL NODE (Nodemailer)
            if (currentNode.data.label.includes('Gmail') && context.aiResponse) {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
                });
                const recipient = context.email || currentNode.data.toEmail;
                await transporter.sendMail({
                    from: `"AutoFlow Engine" <${process.env.GMAIL_USER}>`,
                    to: recipient,
                    subject: `Update regarding ${workflow.name}`,
                    text: context.aiResponse
                });
                console.log(`\x1b[32m      └─ Gmail: Email dispatched to ${recipient}\x1b[0m`);
            }

            // 5. HTTP / WEBHOOK NODE (IoT / Drone Control)
            if (currentNode.data.label.includes('HTTP')) {
                const targetUrl = currentNode.data.url;
                if (targetUrl) {
                    await axios.post(targetUrl, {
                        payload: context.aiResponse,
                        timestamp: new Date().toISOString(),
                        source: "AutoFlow_Cloud_V2.6"
                    });
                    console.log(`\x1b[32m      └─ HTTP: Command sent to hardware at ${targetUrl}\x1b[0m`);
                }
            }
        } catch (error) {
            console.error(`\x1b[31m      └─ Engine Error [${currentNode.data.label}]:\x1b[0m`, error.message);
        }

        const outgoingEdges = workflow.edges.filter(e => e.source === nodeId);
        await Promise.all(outgoingEdges.map(edge => executeNode(edge.target)));
    }

    const startNode = workflow.nodes.find(n => n.type === 'input' || n.data.label.includes('Trigger'));
    if (startNode) await executeNode(startNode.id);
}

// --- API ROUTES ---

// Health Check / Production Landing
app.get('/', (req, res) => {
    res.status(200).json({
        status: "online",
        engine: "AutoFlow v2.6",
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
    });
});

app.get('/api/workflows', async (req, res) => {
    try {
        const workflows = await Workflow.find().sort({ createdAt: -1 }).select('-__v');
        res.json(workflows);
    } catch (err) {
        res.status(500).json({ message: "Error fetching workflows" });
    }
});

app.get('/api/workflows/:id', async (req, res) => {
    try {
        const workflow = await Workflow.findById(req.params.id);
        if (!workflow) return res.status(404).json({ message: "Workflow not found" });
        res.json(workflow);
    } catch (err) {
        res.status(500).json({ error: "Failed to load workflow data" });
    }
});

app.post('/api/workflows', async (req, res) => {
    try {
        const { name, nodes, edges } = req.body;
        const newWorkflow = new Workflow({ name, nodes, edges });
        await newWorkflow.save();
        console.log(`\x1b[35m[SAVE]\x1b[0m New Workflow: ${newWorkflow.name}`);
        res.status(201).json(newWorkflow);
    } catch (err) {
        res.status(500).json({ error: "Failed to create workflow" });
    }
});

app.put('/api/workflows/:id', async (req, res) => {
    try {
        const { name, nodes, edges } = req.body;
        const updated = await Workflow.findByIdAndUpdate(req.params.id, { name, nodes, edges }, { new: true });
        console.log(`\x1b[34m[UPDATE]\x1b[0m Modified: ${req.params.id}`);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to update workflow" });
    }
});

app.post('/api/workflows/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;
        const workflow = await Workflow.findById(id);
        if (!workflow) return res.status(404).send("Workflow not found");

        if (activeTasks[id]) activeTasks[id].stop();

        // Standard 1-minute pulse check
        activeTasks[id] = cron.schedule('* * * * *', () => {
            runEngine(workflow, { name: "System Pulse" }, "Polling");
        });

        console.log(`\x1b[32m[LIVE]\x1b[0m Automation activated for ${workflow.name}`);
        res.status(200).json({ status: "Activated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/workflows/:id/deactivate', async (req, res) => {
    const { id } = req.params;
    if (activeTasks[id]) {
        activeTasks[id].stop();
        delete activeTasks[id];
        console.log(`\x1b[31m[STOP]\x1b[0m Automation halted for ${id}`);
        return res.status(200).json({ status: "Deactivated" });
    }
    res.status(400).send("No active task found");
});

app.delete('/api/workflows/:id', async (req, res) => {
    try {
        await Workflow.findByIdAndDelete(req.params.id);
        res.json({ message: "Workflow deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete" });
    }
});

app.post('/api/forms/bakery-order', async (req, res) => {
    const { customerName, customerPhone, customerEmail, workflowId } = req.body;
    console.log(`\x1b[35m[WEBHOOK]\x1b[0m Order Received: ${customerName}`);
    try {
        const workflow = await Workflow.findById(workflowId);
        if (!workflow) return res.status(404).json({ error: "Workflow ID not found" });
        res.status(200).json({ status: "success" });
        runEngine(workflow, { name: customerName, phone: customerPhone, email: customerEmail }, "Trigger");
    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

// --- SERVER STARTUP ---
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`\n\x1b[95m🚀 AutoFlow Engine v2.6 (Production Ready) Online\x1b[0m`);
    console.log(`Endpoint: http://localhost:${PORT} | Cloud Status: Active\n`);
});

// --- GRACEFUL SHUTDOWN LOGIC ---
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received. Closing HTTP server...');
    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed. Engine offline.');
            process.exit(0);
        });
    });
});