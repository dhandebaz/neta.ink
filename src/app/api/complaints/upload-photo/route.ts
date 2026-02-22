import { NextRequest, NextResponse } from "next/server";
import { uploadFileToR2 } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "File is required", url: null },
      { status: 400 }
    );
  }

  const contentType = file.type || "application/octet-stream";

  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      { success: false, error: "Only image uploads are allowed", url: null },
      { status: 400 }
    );
  }

  const extension = contentType.split("/")[1] || "jpg";
  const key = `complaints/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;

  try {
    const url = await uploadFileToR2(key, file, contentType);

    return NextResponse.json({
      success: true,
      url
    });
  } catch (error) {
    console.error("Error uploading complaint photo", error);

    return NextResponse.json(
      { success: false, error: "Upload failed", url: null },
      { status: 500 }
    );
  }
}

