# Solution Design Document — Brightline HR Integration Telemetry Platform

**Author:** Forward Deployed Engineer (FDE)  
**Target Audience:** Brightline HR Platform Ops & Leadership (Marcus Webb & Team)  
**Date:** November 2026  

---

## 1. Problem Restatement & Core Goal

Brightline HR relies heavily on external third-party integrations (ADP Payroll, Greenhouse ATS, DocuSign, Directory Sync, Notifications). Currently, the Ops team learns about broken integrations days after failure when customers submit support tickets. 

**Goal:** Build an operational health dashboard that Marcus and his team can glance at every morning to immediately identify which integrations are healthy, which are degraded, and which require urgent repair—without digging through raw database logs manually.

---

## 2. Key Assumptions & Health Evaluation Criteria

Because "unhealthiness" is a judgment call, we established clear, operational thresholds based on common SRE best practices:

### Health Classification Rules

1. **`HEALTHY` (Green):**
   * Error Rate $\le 5.0\%$
   * Average Latency $\le 500\text{ ms}$
   * *Meaning:* Integrations are operating within normal limits.

2. **`DEGRADED` (Yellow):**
   * Error Rate between $5.0\%$ and $20.0\%$, OR
   * Average Latency $> 500\text{ ms}$
   * *Meaning:* Users may experience slowness or occasional retries. Requires Ops attention during business hours.

3. **`UNHEALTHY` (Red):**
   * Error Rate $> 20.0\%$
   * *Meaning:* Critical service failure. Multiple customer transactions are actively failing. Requires immediate intervention.

---

## 3. Architecture & System Overview

The platform uses a standard 3-tier architecture:

```
[ Angular Dashboard ]  <--->  [ Express API Server ]  <--->  [ PostgreSQL DB ]
         |                             |
         v                             v
[ PDFKit PDF Export ]       [ Gemini AI Service ]
                                       |
                                       v
                             [ Nodemailer SMTP ]
```

### Component Breakdown
* **PostgreSQL Database:** Stores raw HTTP `request_logs` with composite indexing on `(timestamp DESC, integration_id)` for high-speed aggregation queries.
* **Express Backend Service:** Aggregates logs into metrics, computes health statuses, handles error logging middleware, and integrates external services.
* **Gemini AI Service:** Features a multi-model fallback chain (`gemini-3.5-flash-lite`, `gemini-3.8-flash`, `gemini-3.5-flash`) to ensure high availability when generating plain-English SRE playbooks.
* **Email & PDF Dispatcher:** Generates styled PDF reports on the fly using `pdfkit` and dispatches them via SMTP to stakeholders.
* **Angular Dashboard Frontend:** Provides a clean interface with summary badges, status cards, dynamic filters, drill-down log accordions, and PDF generation tools.

---

## 4. Trade-Offs & Design Decisions

| Decision | Chosen Approach | Trade-Off / Reason |
|---|---|---|
| **Log Storage** | PostgreSQL Relational Table | Relational queries allow instant SQL `COUNT` and `AVG` aggregations without introducing complex external stream processors for v1. |
| **AI Model Selection** | Fallback Chain starting with `gemini-3.5-flash-lite` | Prioritizes sub-second response times and low API latency while keeping higher-tier models ready if rate limits occur. |
| **PDF Generation** | Server-side (`pdfkit`) & Client-side (`jsPDF`) | Dual implementation guarantees team members can download reports offline or email them automatically without client browser dependencies. |

---

## 5. What We Would Do With More Time & Budget (Future Work)

1. **Automated Alerting (Webhooks / PagerDuty):** Replace manual email dispatches with automated Webhook triggers sent to Slack channels or PagerDuty whenever an integration hits `UNHEALTHY`.
2. **Dynamic Sliding Windows:** Allow Ops operators to switch between dynamic time ranges (e.g., 15 minutes, 1 hour, 6 hours, 24 hours) via the UI.
3. **Redis Metric Caching:** Cache aggregated telemetry state in Redis to support thousands of concurrent dashboard views without querying PostgreSQL on every refresh.
4. **Automated Self-Healing Scripts:** Allow Ops engineers to trigger automated service restarts directly from the Gemini AI diagnostic playbook recommendations.