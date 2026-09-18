import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Ensure environment variables are loaded (in a real app, AWS SDK does this automatically if configured)
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_S3_BUCKET_NAME;

// Instantiate the S3 client conditionally to not crash if env vars are missing during build/dev
let s3Client: S3Client | null = null;
if (region && accessKeyId && secretAccessKey) {
  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }

    if (!s3Client || !bucketName) {
      console.warn("S3 is not fully configured. AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME must be set.");
      // Fallback for development if S3 isn't configured: just return a dummy URL or you can route to local upload.
      return NextResponse.json(
        { error: "S3 configuration is missing on the server." },
        { status: 500 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Sanitize filename but preserve dots
    const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const filename = `uploads/${uniqueSuffix}-${originalName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
      // Optional: ACL: "public-read" if you want files to be directly accessible via standard S3 URL.
      // But standard practice now is to rely on bucket policies or presigned URLs.
    });

    await s3Client.send(command);

    // Construct the public URL (assuming public bucket, or we can use the S3 URL format)
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${filename}`;

    return NextResponse.json({ url: fileUrl });
  } catch (error: any) {
    console.error("S3 upload error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload file.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
