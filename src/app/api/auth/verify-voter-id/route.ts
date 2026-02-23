import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { extractVoterIdData } from "@/lib/ai/router";
import { uploadBufferToR2 } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "Image file is required" },
      { status: 400 }
    );
  }

  const contentType = file.type || "application/octet-stream";

  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      { success: false, error: "Only image uploads are allowed" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");

  let ocrResult;

  try {
    ocrResult = await extractVoterIdData(contentType, base64);
  } catch (error) {
    console.error("Error during voter ID OCR", error);
    return NextResponse.json(
      {
        success: false,
        error: "We could not analyze this ID. Please try again with a clearer photo."
      },
      { status: 502 }
    );
  }

  if (!ocrResult.valid) {
    return NextResponse.json(
      { success: false, error: ocrResult.reason },
      { status: 400 }
    );
  }

  const epicNo = ocrResult.epic_no.trim().toUpperCase();

  if (!epicNo) {
    return NextResponse.json(
      {
        success: false,
        error: "Could not read the EPIC number. Please try again with a clearer photo."
      },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      sql`${users.id} <> ${currentUser.id} and ${users.voter_id_data} ->> 'epic_no' = ${epicNo}`
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: "This Voter ID is already registered to another account."
      },
      { status: 409 }
    );
  }

  const extension = contentType.split("/")[1] || "jpg";
  const key = `kyc/voter-ids/${currentUser.id}-${Date.now()}.${extension}`;

  let imageUrl: string;

  try {
    imageUrl = await uploadBufferToR2(key, buffer, contentType);
  } catch (error) {
    console.error("Error uploading voter ID image to R2", error);
    return NextResponse.json(
      {
        success: false,
        error: "Upload failed. Please try again."
      },
      { status: 500 }
    );
  }

  try {
    await db
      .update(users)
      .set({
        voter_id_verified: true,
        voter_id_data: ocrResult as any,
        voter_id_image_url: imageUrl
      })
      .where(eq(users.id, currentUser.id));
  } catch (error) {
    console.error("Error updating voter ID verification", error);
    return NextResponse.json(
      {
        success: false,
        error: "We could not save your verification. Please try again."
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Voter ID Verified"
  });
}
