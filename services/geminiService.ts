import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult } from "../types";

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    offerType: { type: Type.STRING },
    sourceVerification: { type: Type.STRING },
    companyVerification: { type: Type.STRING },
    internshipDetailsReview: { type: Type.STRING },
    redFlagsDetected: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    credibilityScore: { type: Type.NUMBER },
    finalVerdict: {
      type: Type.STRING,
      enum: ["Legit", "Suspicious", "Fake"],
    },
    safetyAdvice: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    "offerType",
    "sourceVerification",
    "companyVerification",
    "internshipDetailsReview",
    "redFlagsDetected",
    "credibilityScore",
    "finalVerdict",
    "safetyAdvice",
  ],
};

export class GeminiService {
  private ai: GoogleGenAI;
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async analyzeOffer(
    content: string,
    type: 'text' | 'image' | 'url',
    imageMimeType = 'image/jpeg'
  ): Promise<AnalysisResult> {
    if (!this.apiKey) {
      throw new Error("Missing Gemini API key. Add VITE_GEMINI_API_KEY to .env, then restart the dev server.");
    }

    const inputDescription = type === 'image'
      ? 'An uploaded image is attached. Read any visible text in the image and analyze whether it is a real internship/job offer, a certificate, or something else.'
      : `${type === 'url' ? 'URL to investigate' : 'Offer content'}: ${content}`;

    const prompt = `
      You are an AI Scam Detection Analyst specialized in identifying fake internship and job offers.
      Your task is to analyze the provided input and determine if it is a scam.

      Input: ${inputDescription}

      Follow this workflow:
      1. Identify input type.
      2. Confirm if it is an internship/job offer.
      3. Verify source, including official domain and website legitimacy when available.
      4. Analyze role details, duration, stipend, interview process, and HR information.
      5. Detect red flags such as money requests, urgency, vague promises, unofficial domains, or poor formatting.
      6. Calculate a credibility score from 0 to 100.

      Deduction rules:
      - No official email domain: -15
      - No company website: -20
      - Asking for money or fees: -40
      - No interview process: -20
      - Unrealistic stipend or role: -15
      - No online presence: -25
      - Poor formatting or missing information: -10
      - Not actually a job or internship offer: classify based on the document type and explain clearly.

      Classification:
      - 80-100 -> Legit
      - 50-79 -> Suspicious
      - < 50 -> Fake
    `;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          parts: [
            { text: prompt },
            ...(type === 'image' ? [{ inlineData: { data: content, mimeType: imageMimeType } }] : [])
          ]
        }],
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: analysisSchema,
        },
      } as any);

      let resultText = response.text || '{}';
      if (resultText.includes('```')) {
        const match = resultText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          resultText = match[1];
        }
      }

      const parsed = JSON.parse(resultText.trim()) as AnalysisResult;
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        parsed.groundingSources = groundingChunks
          .filter(chunk => chunk.web)
          .map(chunk => ({
            title: chunk.web?.title || 'External Source',
            uri: chunk.web?.uri || ''
          }));
      }

      return parsed;
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      throw new Error(this.getHelpfulErrorMessage(error));
    }
  }

  private getHelpfulErrorMessage(error: unknown): string {
    const rawMessage = error instanceof Error ? error.message : String(error);
    let providerMessage = rawMessage;

    const jsonMatch = rawMessage.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        providerMessage = JSON.parse(jsonMatch[0])?.error?.message || rawMessage;
      } catch {
        providerMessage = rawMessage;
      }
    }

    if (/reported as leaked/i.test(providerMessage)) {
      return "The Gemini API key in .env was rejected because Google marked it as leaked. Create a new key in Google AI Studio, replace VITE_GEMINI_API_KEY, and restart the dev server.";
    }

    if (/quota|rate limit|429/i.test(rawMessage)) {
      return "Gemini quota is unavailable for this API key/model. Check billing/quota in Google AI Studio or use a fresh key, then restart the dev server.";
    }

    if (/API key not valid|permission_denied|403/i.test(rawMessage)) {
      return `Gemini rejected the API key: ${providerMessage}`;
    }

    return `Gemini analysis failed: ${providerMessage}`;
  }
}
