import OpenAI from "openai";
const apiKey = import.meta.env.VITE_OPEN_AI_API_KEY;

export const openai = new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true,
  headers: {
    Authorization: `Bearer ${apiKey}`,
  }
});