// S3-compat Wasabi
import { S3_ACCESS_KEY, S3_REGION, S3_SECRET_KEY, S3_SERVICE_URL } from "$env/static/private";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export const getS3Client = () => {
  const httpHandler = new NodeHttpHandler({ requestTimeout: 10000 });
  return new S3Client({
    region: S3_REGION,
    endpoint: S3_SERVICE_URL,
    requestHandler: httpHandler,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY
    }
  });
};

export const writeFileToS3 = (
  client: S3Client,
  bucketName: string,
  filePath: string,
  data: Buffer
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filePath,
    Body: data
  });
  return client
    .send(command)
    .then((result: any) => {
      return filePath;
    })
    .catch((err: any) => {
      console.error("Error writing file to S3", err);
      throw err;
    });
};
