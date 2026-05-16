import { NextRequest, NextResponse } from "next/server";

import { analyzeRoomImageMock } from "@/lib/room-analysis";

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const fileValue = formData?.get("roomImage");

  if (!(fileValue instanceof File)) {
    return NextResponse.json(
      {
        error: "roomImage 파일이 필요합니다.",
      },
      { status: 400 },
    );
  }

  const analysis = analyzeRoomImageMock({
    name: fileValue.name || "room-image",
    type: fileValue.type || "application/octet-stream",
    size: fileValue.size,
  });

  return NextResponse.json({
    analysis,
    meta: {
      analysisId: analysis.id,
      mode: analysis.source,
    },
  });
}
