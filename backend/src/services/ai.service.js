/**
 * Enterprise-grade Gemini AI service with robust model fallback and error handling.
 */
import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env.config.js';

// Initialize Google GenAI client instance using API key from environment configuration
const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });

/**
 * Generates elite executive SRE insights and self-healing playbooks with robust model fallback handling[cite: 11].
 */
export const generateAiHealthInsights = async (healthPayload) => {
  // Construct detailed prompt for Gemini AI explaining system telemetry in friendly, non-technical terms[cite: 11]
  const prompt = `
    You are a friendly, expert System Reliability Guide for Brightline HR Enterprise Platform. 
    Your job is to explain system health telemetry to non-technical users and team operators in a very simple, clear, human, and conversational tone (avoid overly dense technical jargon where possible, or explain it simply).

    Please analyze the following telemetry JSON data and structure your response cleanly using these exact sections with clear formatting:

    ### 1. 📊 Executive Overview & What's Happening
    - Give a friendly summary of the system status in simple words.
    - Explain if everything is running smoothly or if something needs attention.

    ### 2. 🔍 Root Cause & Impact Analysis
    - **Problem Identified:** (Describe the exact issue simply)
    - **Severity Status:** [HIGH] / [MEDIUM] / [LOW] / [STABLE]
    - **What Problem It Creates:** (Explain the real-world business impact or user friction, e.g., delays, blocked logins, sync failures)

    ### 3. 🛠️ Simple Actionable Fix & Solutions
    - **Quick Fix (Immediate Action):** What can the team do right now to solve it?
    - **Long-term Prevention:** How to prevent it from happening again in the future?

    Keep the tone encouraging, crystal clear, and easy to read at a glance.

    Telemetry Data:
    ${JSON.stringify(healthPayload, null, 2)}
  `;

  // Updated fallback chain with recommended 3.5-flash-lite first[cite: 11]
  const modelsToTry = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.5-flash'
  ];

  let lastError = null;

  // Loop through model fallback chain to ensure high availability during AI generation[cite: 11]
  for (const modelName of modelsToTry) {
    try {
      console.log(`Attempting SRE insight generation using model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      // Return generated model name and text response if successful[cite: 11]
      if (response && (response.text || response.candidates?.[0])) {
        return {
          modelUsed: modelName,
          insights: response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text'
        };
      }
    } catch (error) {
      lastError = error;
      console.warn(`Model ${modelName} failed (${error.status || 'Error'}: ${error.message}). Trying next fallback...`);
    }
  }

  // Throw error if all models in the fallback chain fail[cite: 11]
  throw new Error(`All Gemini fallback models failed: ${lastError?.message || 'Unknown error'}`);
};