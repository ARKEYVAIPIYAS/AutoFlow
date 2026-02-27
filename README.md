# AutoFlow PRO

AutoFlow PRO is an industrial‑grade, cloud‑native automation SaaS platform built around a visual "logic chain" engine.  The system is split into a React frontend (Vercel) and an Express backend (Render) with a MongoDB Atlas cloud database.

## 🚀 Features

* AI‑driven workflow nodes (Gemini 2.5 Flash)  
* Multi‑channel outputs: Gmail, WhatsApp, HTTP webhooks for IoT  
* Real‑time dashboard with live polling and control  
* User authentication (JWT) and tenant isolation  
* Rate limiting, helmet, CORS, compression for security & performance  
* Modular codebase with controllers, routers, middleware, and models  

## 🛠️ Setup

1. **Clone repository** and install dependencies:
   ```bash
   git clone <repo-url> AutoFlow
   cd AutoFlow
   npm install           # backend
   cd autoflow-frontend
   npm install           # frontend
   ```

2. **Configure environment variables** (`.env` at project root):
   ```env
   PORT=10000
   MONGO_URI=<mongodb‑atlas‑uri>
   GEMINI_KEY=<google‑genai‑api‑key>
   TWILIO_SID=<twilio‑sid>
   TWILIO_AUTH_TOKEN=<twilio‑auth>
   TWILIO_PHONE=whatsapp:+1234567890
   GMAIL_USER=<gmail‑address>
   GMAIL_PASS=<gmail‑app‑password>
   JWT_SECRET=<long‑random‑string>
   ```

3. **Run development servers**:
   ```bash
   # backend
   npm run dev    # uses nodemon
   # frontend (in separate terminal)
   cd autoflow-frontend && npm start
   ```

4. **Register a user** and use the dashboard to create/manage workflows.

## 📦 Deployment

* Backend: Render (current url `https://autoflow-caor.onrender.com`)  
* Frontend: Vercel (current url `https://autoflow-frontend-ten.vercel.app`)  
* DB: MongoDB Atlas (Mumbai cluster)

## 🔐 Security & Maintenance

* Audit packages with `npm audit` (vulnerabilities fixed where possible).
* Ensure JWT secret and API keys are kept safe.
* Consider migrating the frontend off `react-scripts` to eliminate lingering CVEs – e.g. Vite or Next.js.
* Enable HTTPS, backup MongoDB, and monitor logs/metrics.

## 📈 Next Steps

* Add billing/subscription system (Stripe).
* Containerize services with Docker/Kubernetes.
* Add comprehensive tests (Jest, React Testing Library).
* Improve frontend design and accessibility.
* Add analytics, logging (Winston/Datadog), and CI/CD pipelines.

---

This README will grow as the project scales!

