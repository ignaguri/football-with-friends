// R2 storage utilities for profile pictures

export interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
    }
  ): Promise<R2Object>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<R2Objects>;
}

export interface R2Object {
  key: string;
  size: number;
  etag: string;
  httpMetadata?: {
    contentType?: string;
  };
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
}

// Generate a unique key for profile pictures
export function generateProfilePictureKey(userId: string, fileType: string): string {
  const extension = fileType.split("/")[1] || "jpg";
  const timestamp = Date.now();
  return `profile-pictures/${userId}/${timestamp}.${extension}`;
}

// Get the public URL for an R2 object
// Note: R2 public access needs to be configured via Cloudflare dashboard
// or use a custom domain with R2 public bucket settings
export function getR2PublicUrl(
  key: string,
  accountId: string,
  bucketName: string
): string {
  // Public R2 URL format for buckets with public access enabled
  // Format: https://pub-{hash}.r2.dev/{key}
  // Or with custom domain: https://your-domain.com/{key}
  // For now, we'll use the API to serve files directly
  return `/api/profile/picture/${encodeURIComponent(key)}`;
}

// Upload a file to R2
export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer,
  contentType: string
): Promise<R2Object> {
  return bucket.put(key, data, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000", // 1 year cache
    },
  });
}

// Delete a file from R2
export async function deleteFromR2(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key);
}

// Get a file from R2
export async function getFromR2(
  bucket: R2Bucket,
  key: string
): Promise<R2ObjectBody | null> {
  return bucket.get(key);
}

// Delete old profile pictures for a user (cleanup)
export async function deleteOldProfilePictures(
  bucket: R2Bucket,
  userId: string,
  keepLatest = 1
): Promise<void> {
  const prefix = `profile-pictures/${userId}/`;
  const { objects } = await bucket.list({ prefix });

  // Sort by key (which contains timestamp) descending
  const sorted = objects.sort((a, b) => b.key.localeCompare(a.key));

  // Delete all but the latest N
  const toDelete = sorted.slice(keepLatest);
  await Promise.all(toDelete.map((obj) => bucket.delete(obj.key)));
}
