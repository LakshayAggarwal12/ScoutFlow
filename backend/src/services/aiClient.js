import axios from "axios";
import { env } from "../config/env.js";

const client = axios.create({ baseURL: env.aiServiceUrl, timeout: 60000 });

export async function parseRequirement(prompt) {
  const { data } = await client.post("/ai/parse-requirement", { prompt });
  return data;
}

export async function planWorkflow(structuredRequirement) {
  const { data } = await client.post("/ai/plan-workflow", { structured_requirement: structuredRequirement });
  return data;
}

export async function extractFields(rawContent, fields) {
  // Extraction retries rate limits inside the AI service: each attempt can
  // sleep up to _MAX_RETRY_WAIT_SECONDS honoring Groq's "try again in Ns"
  // hint, so a full 3-attempt chain can take ~2-3 minutes. Time out below
  // that and we discard work the AI service actually completed.
  const { data } = await client.post(
    "/ai/extract",
    { raw_content: rawContent, fields },
    { timeout: 200000 }
  );
  return data;
}
