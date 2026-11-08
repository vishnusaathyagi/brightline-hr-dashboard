# 📊 Brightline HR — API Integration Health & SRE Diagnostic Dashboard

An enterprise-ready Service Level Indicator (SLI) telemetry dashboard and AI-assisted incident diagnosis platform built for **Brightline HR**.

This application provides real-time visibility into third-party HR system integrations (Payroll, E-Signatures, Applicant Tracking Systems, Directory Sync, and Notifications). It processes raw HTTP telemetry logs from PostgreSQL, computes dynamic health metrics across rolling windows, generates plain-English diagnostic playbooks using Google Gemini AI, and sends automated executive PDF incident reports via email.

---

## 📸 System Architecture & Dashboard Previews

```text
┌─────────────────────────┐           HTTP / REST           ┌─────────────────────────┐           SQL Queries           ┌─────────────────────────┐
│                         │ ──────────────────────────────> │                         │ ──────────────────────────────> │                         │
│   Angular 22.2 Client   │                                 │   Express API Engine    │                                 │   PostgreSQL Database   │
│ (Tailwind UI + RxJS)    │ <────────────────────────────── │   (Node.js ES Modules)  │ <────────────────────────────── │   (Indexed request_logs)│
└─────────────────────────┘                                 └─────────────────────────┘                                 └─────────────────────────┘
             │                                                           │
             │ Client PDF Export                                         │ Multi-Model AI Fallback Chain
             ▼                                                           ▼
┌─────────────────────────┐                                 ┌─────────────────────────┐
│   PDFKit Client Engine  │                                 │    Google Gemini AI     │
│   (Instant Export)      │                                 │  (SRE Playbook Service) │
└─────────────────────────┘                                 └─────────────────────────┘
                                                                         │
                                                                         │ SMTP PDF Attachment
                                                                         ▼
                                                            ┌─────────────────────────┐
                                                            │  Nodemailer Email Hub   │
                                                            │ (Executive Dispatcher)  │
                                                            └─────────────────────────┘
```

<details>
<summary>📸 <strong>Click here to view Dashboard Screenshots & UI Previews</strong></summary>

<br/>

### 1. Executive Health Overview & SLI Summary Cards
![Dashboard Overview](./assets/screenshots/dashboard-overview.png)
*Displays aggregated health badges (HEALTHY, DEGRADED, UNHEALTHY), error rates, average latency, and total telemetry request counts per third-party provider.*

---

### 2. Detailed Integration Telemetry & Accordion Logs
![Telemetry Accordion](./assets/screenshots/telemetry-accordion.png)
*Allows engineers to expand integration cards to inspect endpoint paths, HTTP status codes, p95 response latencies, and detailed error messages.*

---

### 3. Gemini AI SRE Incident Playbook
![AI Playbook](./assets/screenshots/ai-playbook.png)
*Generates plain-English root cause analysis and immediate self-healing step recommendations for degraded or broken integrations using Google Gemini AI.*

---

### 4. Executive Email & PDF Report Dispatch
![Email Report](./assets/screenshots/email-report.png)
*Generates styled executive PDF reports on the fly and dispatches them directly via SMTP to platform operations leadership.*

</details>

---

## 🎯 Business Capabilities & Problem Solved

### The Problem
Previously, the Brightline HR Operations team only discovered broken integrations when customers logged support tickets—often days after failures began. Ops teams had to write manual SQL queries against millions of raw database logs to trace failing endpoints.

### The Solution
1. **At-a-Glance Operational Status:** Instantly classifies third-party services into `HEALTHY`, `DEGRADED`, or `UNHEALTHY` states.
2. **Interactive Telemetry Drill-Down:** Expandable accordion cards and dropdown log inspectors display endpoint-level metrics, status codes, p95 response times, and failure messages.
3. **AI SRE Incident Playbooks:** One-click Gemini AI diagnosis breaks down failure root causes into plain English with immediate remediation steps.
4. **Automated Executive Reporting:** Generates styled PDF summaries on demand and emails them to platform stakeholders with attached telemetry reports.

---

## 📊 Health Classification Rules & SRE Metrics

The health evaluation engine runs dynamic window queries over `request_logs` using the following SRE criteria:

* 🟢 **`HEALTHY`**: Error Rate $\le 5.0\%$ AND Average Latency $\le 500\text{ ms}$. Services are operating normally.
* 🟡 **`DEGRADED`**: Error Rate between $5.0\%$ and $20.0\%$, OR Average Latency $> 500\text{ ms}$. Indicates degraded performance or intermittent network timeouts requiring team attention.
* 🔴 **`UNHEALTHY`**: Error Rate $> 20.0\%$. Critical operational failure requiring immediate intervention.

---

## 🛠️ Complete Technical Stack

| Layer | Component | Version | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | Angular | `22.2.5` | Standalone components, reactive forms, RxJS streams, and Tailwind CSS. |
| **Testing** | Vitest & JSDOM | `5.0.0` / `30.0.0` | High-speed unit test suite for Angular dashboard components. |
| **Backend** | Node.js & Express | `v4.21.2` | RESTful API server using native ES Modules (`"type": "module"`). |
| **Database** | PostgreSQL | `v8.13.1` (`pg`) | Relational database engine with composite index on `(timestamp DESC, integration_id)`. |
| **AI Diagnostics** | Google GenAI SDK | `^2.32.0` | SRE playbook generator with model fallback chain (`gemini-3.5-flash-lite` ➔ `gemini-3.8-flash` ➔ `gemini-3.5-flash`). |
| **PDF & Email** | PDFKit & Nodemailer | `^0.20.2` / `^10.3.1` | Server-side vector PDF document compiler and SMTP email dispatcher. |

---

## 🚀 Complete Installation & Setup Guide

### System Requirements
Ensure you have the following tools installed locally:
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher
* **PostgreSQL Server**: `v14.0` or higher

### 1. Database & Backend Setup (`/backend`)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the `backend/` directory:
   ```env
   # Server Port
   PORT=3000

   # PostgreSQL Connection String
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/brightline_hr

   # Google Gemini AI API Key
   GEMINI_API_KEY=your_gemini_api_key_here

   # SMTP Dispatch Credentials
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_gmail_app_password
   ```

4. **Initialize database schema and seed log dataset:**
   Ensure PostgreSQL is running and the database `brightline_hr` is created, then execute:
   ```bash
   npm run db:seed
   ```

5. **Start the Express API server:**
   ```bash
   npm run dev
   ```
   *The server will start listening at `http://localhost:3000`.*

---

### 2. Frontend Dashboard Setup (`/frontend`)

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Angular dependencies:**
   ```bash
   npm install
   ```

3. **Launch the Angular development server:**
   ```bash
   npm start
   ```

4. **Access the web application:**
   Open your browser and navigate to `http://localhost:4200`.

---

## 🧪 Running Tests & Quality Checks

Run the Vitest test suite for frontend components:
```bash
cd frontend
npm run test
```

---

## ⚠️ Known Limitations & Enterprise Roadmap

1. **Redis Telemetry Caching:** V1 aggregates queries directly from PostgreSQL. Future updates will introduce a Redis caching layer to support high-throughput telemetry ingestion.
2. **Automated Webhook Alerts:** Current reporting is triggered on demand. V2 will integrate webhooks to dispatch PagerDuty and Slack alerts automatically when an integration enters an `UNHEALTHY` state.
3. **Dynamic Sliding Windows:** V1 aggregates over a seeded dataset window. Future versions will introduce interactive UI controls for selecting standard time windows (e.g., 15m, 1h, 24h, 7d).