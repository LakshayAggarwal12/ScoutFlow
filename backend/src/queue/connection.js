import IORedis from "ioredis";
import { env } from "../config/env.js";

// BullMQ requires this exact option on its Redis connection.
// One shared connection for the whole process (queue + worker).
export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});
