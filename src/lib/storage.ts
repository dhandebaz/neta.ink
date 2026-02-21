import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Buffer } from "node:buffer";

function createR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials are not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

function getR2BucketConfig() {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!bucketName || !publicBaseUrl) {
    throw new Error("R2 bucket configuration is not fully set");
  }

  return { bucketName, publicBaseUrl };
}

async function putObjectToR2(key: string, body: Buffer | Uint8Array, contentType: string) {
  const client = createR2Client();
  const { bucketName } = getR2BucketConfig();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType
  });

  await client.send(command);
}

function buildPublicUrl(key: string) {
  const { publicBaseUrl } = getR2BucketConfig();
  const base = publicBaseUrl.endsWith("/") ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
  return `${base}/${key}`;
}

export async function uploadBufferToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await putObjectToR2(key, buffer, contentType);
  return buildPublicUrl(key);
}

export async function uploadFileToR2(
  key: string,
  file: Blob,
  contentType: string
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  await putObjectToR2(key, bytes, contentType);
  return buildPublicUrl(key);
}
