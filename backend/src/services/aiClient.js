import axios from "axios";
import { env } from "../config/env.js";

const client = axios.create({ baseURL: env.aiServiceUrl, timeout: 15000 });

export async function parseRequirement(prompt) {
  const { data } = await client.post("/ai/parse-requirement", { prompt });
  return data;
}

export async function planWorkflow(structuredRequirement) {
  const { data } = await client.post("/ai/plan-workflow", { structured_requirement: structuredRequirement });
  return data;
}

export async function extractFields(rawContent, fields) {
  const { data } = await client.post("/ai/extract", { raw_content: rawContent, fields });
  return data;
}
