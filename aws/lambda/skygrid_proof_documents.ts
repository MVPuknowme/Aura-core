import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({});

const DEFAULT_BUCKET = "skygrid-onboarder-documents";
const BUCKET_NAME = process.env.SKYGRID_ONBOARDER_DOCUMENTS_BUCKET ?? DEFAULT_BUCKET;

const ALLOWED_DOCUMENT_TYPES = [
  "identity",
  "infrastructure",
  "preflight",
  "agreement",
  "insurance",
  "site_photo",
  "device_photo",
  "utility_bill",
  "business_record",
  "other",
] as const;

type ProofDocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number];

type UploadProofDocumentInput = {
  onboarderId: string;
  documentType: ProofDocumentType;
  fileBuffer: Buffer;
  fileName: string;
  contentType?: string;
};

function requireSafeSegment(value: string, fieldName: string): string {
  if (!value || typeof value !== "string") {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  const trimmed = value.trim();
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (!safe || safe === "." || safe === "..") {
    throw new Error(`Invalid ${fieldName}`);
  }

  return safe;
}

function assertDocumentType(documentType: string): ProofDocumentType {
  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType as ProofDocumentType)) {
    throw new Error(`Invalid documentType: ${documentType}`);
  }

  return documentType as ProofDocumentType;
}

function assertFileBuffer(fileBuffer: Buffer) {
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new Error("fileBuffer must be a non-empty Buffer");
  }

  const maxBytes = 10 * 1024 * 1024;
  if (fileBuffer.length > maxBytes) {
    throw new Error("fileBuffer exceeds 10MB proof-document limit");
  }
}

export async function uploadProofDocument(input: UploadProofDocumentInput) {
  const onboarderId = requireSafeSegment(input.onboarderId, "onboarderId");
  const documentType = assertDocumentType(input.documentType);
  const fileName = requireSafeSegment(input.fileName, "fileName");

  assertFileBuffer(input.fileBuffer);

  const uploadedAt = new Date().toISOString();
  const s3Key = `onboarders/${onboarderId}/proof/${documentType}/${uploadedAt}-${fileName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: input.fileBuffer,
      ContentType: input.contentType ?? "application/octet-stream",
      ServerSideEncryption: "AES256",
      Metadata: {
        "onboarder-id": onboarderId,
        "document-type": documentType,
        "upload-timestamp": uploadedAt,
        "proof-lane": "skygrid-onboarder",
      },
    }),
  );

  return {
    ok: true,
    bucket: BUCKET_NAME,
    s3Key,
    onboarderId,
    documentType,
    uploadedAt,
  };
}
