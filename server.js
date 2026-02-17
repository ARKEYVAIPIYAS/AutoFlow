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

// --- DATABASE CONNECTION ---
mongoose.connect('mongodb://127.0.0.1:27017/aautoflow')
    .then(() => console.log("\x1b[32m[DB]\x1b[0m Connected to MongoDB"))
    .catch(err => console.error("Could not connect to MongoDB", err));

const activeJobs = {};

// --- THE RECURSIVE ENGINE ---
async function runEngine(workflow, initialData) {
    let context = { ...initialData, aiResponse: "", externalData: "" };
    const visited = new Set();

    async function executeNode(nodeId) {
        if (visited.has(nodeId)) return;
        const currentNode = workflow.nodes.find(n => n.id === nodeId);
        if (!currentNode || !currentNode.data) return;
        visited.add(nodeId);

        console.log(`\x1b[33m[Executing]\x1b[0m ${currentNode.data.label}`);

        try {
            // 1. UNIVERSAL DYNAMIC HTTP NODE
            if (currentNode.data.label.includes('HTTP')) {
                try {
                    const url = currentNode.data.url;
                    const userApiKey = currentNode.data.apiKey; 
                    let headers = { "Accept": "application/json" };

                    if (userApiKey) {
                        headers['x-cg-demo-api-key'] = userApiKey; // For CoinGecko
                        headers['Authorization'] = `Bearer ${userApiKey}`; // For OpenAI
                        headers['x-api-key'] = userApiKey; // Generic
                    }

                    const response = await axios.get(url, {
                        timeout: 10000,
                        headers: headers
                    });

                    context.externalData = JSON.stringify(response.data, null, 2);
                    console.log("\x1b[32m>> Data Fetched Successfully!\x1b[0m");
                } catch (err) {
                    console.error(`\x1b[31m[HTTP Error]\x1b[0m: ${err.message}`);
                    context.externalData = "Error: Check your URL or API Key.";
                }
            }

            // 2. AI NODE (With Rate Limit Protection)
            if (currentNode.data.label.includes('AI')) {
                if (!context.externalData) return;

                // Wait 5 seconds to prevent 429 Rate Limit errors
                console.log("\x1b[36m[System]\x1b[0m Waiting for API cool-down...");
                await new Promise(r => setTimeout(r, 5000));

                try {
                    const apiURL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_KEY}`;
                    const prompt = currentNode.data.instruction || "Analyze this:";
                    const finalPrompt = prompt.replace('{{externalData}}', context.externalData);

                    const response = await axios.post(apiURL, {
                        contents: [{ parts: [{ text: finalPrompt }] }]
                    });
                    context.aiResponse = response.data.candidates[0].content.parts[0].text;
                    console.log("\x1b[32m>> AI Analysis Success!\x1b[0m");
                } catch (err) {
                    if (err.response && err.response.status === 429) {
                        console.error("\x1b[31m[AI Error]\x1b[0m: Still Rate Limited. Wait 2-3 minutes.");
                    } else {
                        console.error(`\x1b[31m[AI Error]\x1b[0m: ${err.message}`);
                    }
                }
            }

            // 3. WHATSAPP (With Phone Sanitizer)
            if (currentNode.data.label.includes('WhatsApp')) {
                if (!context.aiResponse) return;
                const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
                
                // Clean the phone number of any brackets or symbols
                const cleanPhone = currentNode.data.toPhone.replace(/[^\d+]/g, ''); 

                await client.messages.create({
                    from: `whatsapp:${process.env.TWILIO_PHONE}`,
                    to: `whatsapp:${cleanPhone}`,
                    body: context.aiResponse.substring(0, 1550)
                });
                console.log("\x1b[32m>> WhatsApp Sent Successfully!\x1b[0m");
            }

            // 4. GMAIL
            if (currentNode.data.label.includes('Gmail')) {
                if (!context.aiResponse) return;
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
                });
                await transporter.sendMail({
                    from: `"AutoFlow" <${process.env.GMAIL_USER}>`,
                    to: currentNode.data.toEmail,
                    subject: "Workflow Update",
                    text: context.aiResponse
                });
                console.log("\x1b[32m>> Gmail Sent Successfully!\x1b[0m");
            }
        } catch (error) {
            console.error(`\x1b[31m[Error]\x1b[0m at ${currentNode.data.label}:`, error.message);
        }

        const outgoingEdges = workflow.edges.filter(e => e.source === nodeId);
        await Promise.all(outgoingEdges.map(edge => executeNode(edge.target)));
    }

    const startNode = workflow.nodes.find(n => n.type === 'input' || n.data.label.includes('Trigger'));
    if (startNode) await executeNode(startNode.id);
}

// --- API ROUTES ---

// Save workflow
app.post('/api/workflows', async (req, res) => {
    const workflow = new Workflow(req.body);
    await workflow.save();
    res.status(201).send(workflow);
});

// MANUAL RUN (RUN ONCE)
app.post('/api/workflows/:id/run', async (req, res) => {
    const workflow = await Workflow.findById(req.params.id);
    console.log(`\x1b[35m[Manual Run]\x1b[0m Starting single execution for: ${workflow.name}`);
    runEngine(workflow, {}); 
    res.send({ status: "Processing" });
});

// ACTIVATE POLLING (LIVE MODE)
app.post('/api/workflows/:id/activate', async (req, res) => {
    const workflow = await Workflow.findById(req.params.id);
    if (activeJobs[req.params.id]) activeJobs[req.params.id].stop();
    activeJobs[req.params.id] = cron.schedule('*/1 * * * *', () => {
        console.log(`\x1b[36m[Cron Job]\x1b[0m Running scheduled workflow: ${workflow.name}`);
        runEngine(workflow, {});
    });
    res.send({ status: "Active" });
});

// DEACTIVATE POLLING
app.post('/api/workflows/:id/deactivate', (req, res) => {
    if (activeJobs[req.params.id]) {
        activeJobs[req.params.id].stop();
        delete activeJobs[req.params.id];
    }
    res.send({ status: "Inactive" });
});

app.listen(3000, () => console.log("[Server] Running on http://localhost:3000"));