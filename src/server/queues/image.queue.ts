import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const imageQueue = new Queue("images", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export type ImageTargetType = "product" | "store-profile" | "store-banner";

export interface ProcessImageJobPayload {
  targetType: ImageTargetType;
  targetId: string;
  tempFilePath?: string;
  bufferBase64?: string;
  fileName: string;
}
