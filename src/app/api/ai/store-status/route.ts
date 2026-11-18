import { NextRequest } from "next/server";
import { changeStoreStatusController } from "@/server/modules/ai/store-status.controller";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return changeStoreStatusController(req);
}
