import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";

import type { Env } from "@/config/index.js";

interface ObjectStorageClient {
  client: S3Client;
  checkConnection: (signal?: AbortSignal) => Promise<void>;
  close: () => void;
}

function createObjectStorageClient(
  env: Pick<Env, "MINIO_ACCESS_KEY" | "MINIO_ENDPOINT" | "MINIO_REGION" | "MINIO_SECRET_KEY">,
): ObjectStorageClient {
  const client = new S3Client({
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
    endpoint: env.MINIO_ENDPOINT,
    forcePathStyle: true,
    maxAttempts: 1,
    region: env.MINIO_REGION,
  });

  return {
    checkConnection: async (signal) => {
      await client.send(new ListBucketsCommand({}), {
        abortSignal: signal,
      });
    },
    client,
    close: () => client.destroy(),
  };
}

export { createObjectStorageClient, type ObjectStorageClient };
