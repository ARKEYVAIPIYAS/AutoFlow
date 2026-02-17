AutoFlow – Smart Automation Platform
AutoFlow is a full-stack, drag-and-drop automation engine built to streamline workflows for students and small businesses. It allows users to visually design logic flows that fetch external API data, process it using Large Language Models (LLMs), and deliver automated alerts via WhatsApp and Gmail.

🚀 Key Features
Visual Workflow Builder: Intuitive drag-and-drop interface powered by React Flow.

Universal HTTP Node: Supports dynamic API requests with custom headers and API key authentication.

AI-Powered Processing: Integrated with Google Gemini 2.5 Flash for intelligent data analysis and summarization.

Multi-Channel Alerts: Automated messaging support for WhatsApp (via Twilio) and Gmail (via Nodemailer).

Execution Engine: A robust backend recursive engine that manages node dependencies and execution order.

🛠️ Tech Stack
Frontend: React.js, React Flow, Lucide-React.

Backend: Node.js, Express.js.

Database: MongoDB (Mongoose) for flexible workflow schema storage.

APIs: Google Gemini AI, Twilio, CoinGecko.

🧩 Challenges Overcome
Rate Limit Management: Developed an asynchronous throttling mechanism (5-second delay) to handle Gemini API HTTP 429 errors.

Data Integrity: Implemented phone number sanitization to ensure reliable message delivery across different input formats.

Unified Architecture: Successfully managed a Monorepo structure for frontend and backend with a centralized security strategy.

📦 Installation & Setup
Clone the Repository:

Bash
git clone https://github.com/ARKEYVAIPIYAS/AutoFlow.git
cd AutoFlow
Install Dependencies:

Bash
# Root (Backend)
npm install
# Frontend
cd autoflow-frontend && npm install
Environment Variables:
Create a .env file in the root directory and add your credentials:

Plaintext
GEMINI_KEY=your_gemini_api_key
TWILIO_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE=your_twilio_whatsapp_number
GMAIL_USER=your_email
GMAIL_PASS=your_app_password
Run the Platform:

Bash
# Start Backend (Port 3000)
node server.js
# Start Frontend (In a new terminal)
cd autoflow-frontend && npm start
