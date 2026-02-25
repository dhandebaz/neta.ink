import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getS3Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function uploadBufferToR2(buffer: Buffer, key: string, contentType: string = "application/pdf"): Promise<string | null> {
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!client || !bucket || !publicUrl) {
    console.warn("R2 storage not fully configured. Skipping upload.");
    return null;
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return `${publicUrl.replace(/\/$/, "")}/${key}`;
  } catch (error) {
    console.error("R2 Upload Error:", error);
    return null;
  }
}

// Added for compatibility with existing code
export async function uploadFileToR2(key: string, file: Blob, contentType: string = "application/octet-stream"): Promise<string | null> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadBufferToR2(buffer, key, contentType);
}
