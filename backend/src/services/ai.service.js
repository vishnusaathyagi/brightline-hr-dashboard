/**
 * Enterprise-grade Gemini AI service with robust model fallback and error handling.
 */
import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env.config.js';

const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });

/**
 * Generates elite executive SRE insights and self-healing playbooks with robust fallbacks.
 */
export const generateAiHealthInsights = async (healthPayload) => {
  const prompt = `
    You are an elite Principal SRE & Systems Architect for Brightline HR Enterprise Platform.
    Your task is to perform an advanced diagnostic analysis on the following real-time integration health telemetry JSON data.

    Provide an expert-level, actionable incident report structured precisely under these sections:
    
    ### 1. Executive Summary & Business Impact
    - Give a high-level assessment of the system status.
    - Highlight potential business risks (e.g., payroll processing delays, candidate onboarding friction, webhook synchronization failures).

    ### 2. Deep-Dive Root Cause Analysis (RCA)
    - Analyze error rates, request volumes, and P95 latency spikes across integration endpoints.
    - Identify whether anomalies stem from upstream vendor timeouts, database throttling, or invalid payload contracts.

    ### 3. Tiered Self-Healing & Remediation Playbook
    - **Immediate Action (T+0):** Quick operational mitigations (e.g., circuit breaker tripping, flushing stalled connection pools, enabling fallback proxies).
    - **Automated Mitigation (T+5m):** Scripted retries, rate-limit adjustments, or fallback model routing.
    - **Long-term Hardening (T+24h):** Architectural recommendations (e.g., implementing dead-letter queues, exponential backoff, payload validation layers).

    ### 4. Risk Severity Rating
    - Tag the overall payload health with a severity level: [CRITICAL], [HIGH], [MODERATE], or [STABLE].

    Telemetry Data:
    ${JSON.stringify(healthPayload, null, 2)}
  `;

  // Updated fallback chain with recommended 3.5-flash-lite first
  const modelsToTry = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.5-flash'
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`🚀 Attempting SRE insight generation using model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      if (response && (response.text || response.candidates?.[0])) {
        return {
          modelUsed: modelName,
          insights: response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text'
        };
      }
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Model ${modelName} failed (${error.status || 'Error'}: ${error.message}). Trying next fallback...`);
    }
  }

  throw new Error(`All Gemini fallback models failed: ${lastError?.message || 'Unknown error'}`);
};