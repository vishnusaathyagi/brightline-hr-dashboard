/**
 * Gemini AI service with multi-model fallback array to generate executive summaries and playbooks.
 */
import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env.config.js';

// Initialize Gemini SDK with API Key
const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });

// Fallback model sequence to ensure high availability
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

/**
 * Generates AI health summary and playbook using model fallback logic.
 */
export const generateAiHealthInsights = async (healthPayload) => {
  const prompt = `
    You are an enterprise SRE Assistant for Brightline HR. 
    Analyze the following integration health JSON data and provide:
    1. A concise executive summary of system status.
    2. A step-by-step self-healing playbook for any degraded or unhealthy integrations.
    
    Data: ${JSON.stringify(healthPayload)}
  `;

  let lastError = null;

  // Loop through fallback models sequentially until one succeeds
  for (const modelName of MODEL_FALLBACK_CHAIN) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      return {
        modelUsed: modelName,
        insights: response.text()
      };
    } catch (error) {
      lastError = error;
      console.warn(`Model ${modelName} failed, trying next fallback...`);
    }
  }

  throw new Error(`All Gemini fallback models failed: ${lastError?.message}`);
};