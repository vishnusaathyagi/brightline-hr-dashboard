# Brightline HR — API Integration Health Dashboard

A simple, real-time SRE telemetry dashboard and automated incident reporting platform built for Brightline HR. It monitors third-party HR integrations (payroll, e-signature, ATS, directory sync, notifications), calculates health metrics from raw request logs, and uses Gemini AI to generate diagnostic playbooks and executive email reports.

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have the following installed on your machine:
* **Node.js** (v18 or higher)
* **PostgreSQL** (v14 or higher running locally or on a server)
* **npm** or **yarn**

---

### Backend Setup (`/backend`)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (`.env`):**
   Create a `.env` file in the `backend` folder with the following variables:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/brightline_hr
   GEMINI_API_KEY=your_google_gemini_api_key
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_gmail_app_password
   ```

4. **Initialize Database Schema & Run Seeder:**
   Make sure PostgreSQL is running and your database is created, then run:
   ```bash
   npm run db:seed
   ```

5. **Start the Express Server:**
   ```bash
   npm run dev
   ```
   The backend server will run at `http://localhost:3000`.

---

### Frontend Setup (`/frontend`)

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Angular Dashboard:**
   ```bash
   ng serve
   ```
   Open your browser and navigate to `http://localhost:4200`.

---

## 🛠️ Tech Stack & Key Features

* **Frontend:** Angular, Tailwind CSS, PDFKit (for client export)
* **Backend:** Node.js, Express.js, PostgreSQL (`pg` pool)
* **AI Engine:** `@google/genai` with fallback chain (`gemini-3.5-flash-lite` ➔ `gemini-3.8-flash` ➔ `gemini-3.5-flash`)
* **Notification System:** Nodemailer with Gmail SMTP and embedded PDF attachment generation

---

## 💡 What Makes This Platform Special

1. **Real-time Metric Calculation:** Automatically aggregates total requests, error rates, and average latencies per integration.
2. **Drill-down Accordion View:** Expand any integration card to inspect individual raw HTTP request logs (endpoints, status codes, error messages).
3. **AI SRE Diagnostic Playbooks:** Click "Generate AI Insights" to get plain-English root cause analysis and immediate fix steps powered by Gemini AI.
4. **Executive Email Dispatch:** Send styled HTML emails with attached PDF telemetry reports directly to team operators and leadership.

---

## ⚠️ Known Limitations & Future Work

* **Single-instance In-memory Polling:** Current implementation polls PostgreSQL per request; production environments should use Redis for caching telemetry state.
* **Rolling Window Fixed Scope:** Currently aggregates all seeded log data; future versions will support customizable dynamic windows (e.g., last 15 mins, 1 hour, 24 hours).
* **Alert Notifications:** Email dispatch is triggered on demand; future work includes automated webhook alerts to Slack or PagerDuty on `UNHEALTHY` status triggers.