const path = require('path');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const axios = require('axios');
const cors = require('cors');
const cron = require('node-cron');

const Workflow = require('./models/Workflow');

const app = express();
app.use(cors()); 
app.use(express.json());

// --- CLOUD DATABASE CONNECTION ---
// Prioritizes your Atlas link from .env; falls back to local for development
const dbURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aautoflow';

mongoose.connect(dbURI)
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
    console.log(`${color}[${mode.toUpperCase()}] >> Launching: ${workflow.name}\x1b[0m`);

    async function executeNode(nodeId) {
        if (visited.has(nodeId)) return;
        const currentNode = workflow.nodes.find(n => n.id === nodeId);
        if (!currentNode || !currentNode.data) return;
        visited.add(nodeId);

        console.log(`\x1b[90m[Node]\x1b[0m ${currentNode.data.label}`);

        try {
            // 1. TRIGGER NODE (Filtering logic for specific users)
            if (currentNode.data.label.includes('Google Form') || currentNode.data.label.includes('Trigger')) {
                const targetEmail = currentNode.data.targetUserEmail; 
                if (targetEmail && context.email && context.email !== targetEmail) {
                    console.log(`\x1b[31m[GATEKEEPER]\x1b[0m Mismatch: Skipping order for ${context.email}\x1b[0m`);
                    return; 
                }
                console.log("\x1b[32m   └─ Verified: Proceeding with Automation\x1b[0m");
            }

            // 2. AI NODE (Gemini 2.5 Flash Integration)
            if (currentNode.data.label.includes('AI')) {
                console.log("\x1b[36m   └─ Delay: 5s Cool-down for Gemini API...\x1b[0m");
                await new Promise(r => setTimeout(r, 5000)); 

                const apiURL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_KEY}`;
                let prompt = currentNode.data.instruction || "Context:";
                
                if (context.name) prompt = prompt.replace('{{name}}', context.name);
                if (context.email) prompt = prompt.replace('{{email}}', context.email);
                
                const response = await axios.post(apiURL, {
                    contents: [{ parts: [{ text: prompt }] }]
                });
                context.aiResponse = response.data.candidates[0].content.parts[0].text;
                console.log("\x1b[32m   └─ AI: Insight Generated Successfully\x1b[0m");
            }

            // 3. WHATSAPP NODE (Twilio Integration)
            if (currentNode.data.label.includes('WhatsApp') && context.aiResponse) {
                const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
                const recipient = (context.phone || currentNode.data.toPhone).replace(/[^\d+]/g, ''); 
                await client.messages.create({
                    from: `whatsapp:${process.env.TWILIO_PHONE}`,
                    to: `whatsapp:${recipient}`,
                    body: context.aiResponse.substring(0, 1500)
                });
                console.log(`\x1b[32m   └─ WhatsApp: Sent to ${recipient}\x1b[0m`);
            }

            // 4. GMAIL NODE (Nodemailer Integration)
            if (currentNode.data.label.includes('Gmail') && context.aiResponse) {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
                });
                const recipient = context.email || currentNode.data.toEmail;
                await transporter.sendMail({
                    from: `"AutoFlow Studio" <${process.env.GMAIL_USER}>`,
                    to: recipient,
                    subject: "Order Confirmation",
                    text: context.aiResponse
                });
                console.log(`\x1b[32m   └─ Gmail: Sent to ${recipient}\x1b[0m`);
            }

            // 5. HTTP / WEBHOOK NODE (External Hardware/API Trigger)
            if (currentNode.data.label.includes('HTTP')) {
                const targetUrl = currentNode.data.url;
                if (targetUrl) {
                    await axios.post(targetUrl, {
                        customer: context.name,
                        message: context.aiResponse,
                        source: "AutoFlow_Engine_v2.5"
                    });
                    console.log(`\x1b[32m   └─ HTTP: Webhook fired to ${targetUrl}\x1b[0m`);
                }
            }
        } catch (error) {
            console.error(`\x1b[31m   └─ Error at ${currentNode.data.label}:\x1b[0m`, error.message);
        }

        const outgoingEdges = workflow.edges.filter(e => e.source === nodeId);
        await Promise.all(outgoingEdges.map(edge => executeNode(edge.target)));
    }

    const startNode = workflow.nodes.find(n => n.type === 'input' || n.data.label.includes('Trigger'));
    if (startNode) await executeNode(startNode.id);
}

// --- API ROUTES ---

// A. DASHBOARD: GET ALL WORKFLOWS
app.get('/api/workflows', async (req, res) => {
  try {
    const workflows = await Workflow.find().sort({ createdAt: -1 });
    res.json(workflows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching workflows" });
  }
});

// B. STUDIO: GET ONE SPECIFIC WORKFLOW
app.get('/api/workflows/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ message: "Workflow not found" });
    res.json(workflow);
  } catch (err) {
    res.status(500).json({ error: "Failed to load workflow data" });
  }
});

// C. SAVE: CREATE NEW WORKFLOW
app.post('/api/workflows', async (req, res) => {
    try {
        const { name, nodes, edges } = req.body;
        const newWorkflow = new Workflow({ name, nodes, edges });
        await newWorkflow.save();
        console.log(`\x1b[35m[SAVE]\x1b[0m Workflow Created: ${newWorkflow._id}`);
        res.status(201).json(newWorkflow);
    } catch (err) {
        res.status(500).json({ error: "Failed to create workflow" });
    }
});

// D. UPDATE: EDIT EXISTING WORKFLOW
app.put('/api/workflows/:id', async (req, res) => {
    try {
        const { name, nodes, edges } = req.body;
        const updated = await Workflow.findByIdAndUpdate(
            req.params.id, 
            { name, nodes, edges }, 
            { new: true }
        );
        console.log(`\x1b[34m[UPDATE]\x1b[0m Workflow Updated: ${req.params.id}`);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to update workflow" });
    }
});

// E. ENGINE CONTROLS
app.post('/api/workflows/:id/run', async (req, res) => {
    try {
        const workflow = await Workflow.findById(req.params.id);
        if (!workflow) return res.status(404).send("Workflow not found");
        runEngine(workflow, { name: "Manual Run", email: "manual@test.com" }, "RunOnce");
        res.status(200).json({ status: "Run triggered" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/workflows/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;
        const workflow = await Workflow.findById(id);
        if (!workflow) return res.status(404).send("Workflow not found");

        if (activeTasks[id]) activeTasks[id].stop();

        activeTasks[id] = cron.schedule('* * * * *', () => {
            console.log(`\x1b[36m[POLLING]\x1b[0m Pulse check for: ${workflow.name}`);
            runEngine(workflow, { name: "AutoFlow System" }, "Polling");
        });

        console.log(`\x1b[32m[LIVE]\x1b[0m Automation activated for ${id}`);
        res.status(200).json({ status: "Activated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/workflows/:id/deactivate', async (req, res) => {
    const { id } = req.params;
    if (activeTasks[id]) {
        activeTasks[id].stop();
        delete activeTasks[id];
        console.log(`\x1b[31m[STOP]\x1b[0m Polling stopped for ${id}`);
        return res.status(200).json({ status: "Deactivated" });
    }
    res.status(400).send("No active task found");
});

// DELETE WORKFLOW
app.delete('/api/workflows/:id', async (req, res) => {
  try {
    await Workflow.findByIdAndDelete(req.params.id);
    res.json({ message: "Workflow deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// F. WEBHOOKS (Bakery Order / Google Forms)
app.post('/api/forms/bakery-order', async (req, res) => {
    const { customerName, customerPhone, customerEmail, workflowId } = req.body;
    console.log(`\x1b[35m[WEBHOOK]\x1b[0m Received: ${customerName} | ${customerEmail}`);
    try {
        const workflow = await Workflow.findById(workflowId);
        if (!workflow) return res.status(404).json({ error: "Workflow ID not found" });
        res.status(200).json({ status: "success" });
        runEngine(workflow, { name: customerName, phone: customerPhone, email: customerEmail }, "Trigger");
    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

app.use((req, res) => {
    console.log(`\x1b[31m[404]\x1b[0m Invalid Path: ${req.method} ${req.originalUrl}`);
    res.status(404).send("Route not found");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n\x1b[95m🚀 AutoFlow Engine v2.6 Online\x1b[0m`);
    console.log(`Backend Active: Port ${PORT} | Mode: Cloud Persistence\n`);
});