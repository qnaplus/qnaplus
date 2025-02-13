import { getenv } from "@qnaplus/dotenv";
import type { Logger } from "pino";
import * as tus from "tus-js-client";

export interface UploadMetadata {
	bucket: string;
	filename: string;
	type: string;
}

export const upload = (
	data: File,
	metadata: UploadMetadata,
	logger?: Logger,
) => {
	const {
		bucket: bucketName,
		filename: objectName,
		type: contentType,
	} = metadata;
	return new Promise<void>((resolve, reject) => {
		const upload = new tus.Upload(data, {
			endpoint: `${getenv("SUPABASE_URL")}/storage/v1/upload/resumable`,
			retryDelays: [0, 1000, 3000, 5000, 20000],
			headers: {
				authorization: `Bearer ${getenv("SUPABASE_KEY")}`,
				"x-upsert": "true",
			},
			uploadDataDuringCreation: true,
			removeFingerprintOnSuccess: true,
			chunkSize: 6 * 1024 * 1024,
			metadata: {
				bucketName,
				objectName,
				contentType,
				cacheControl: "3600",
			},
			onError(error) {
				logger?.error(error);
				reject();
			},
			onSuccess() {
				logger?.info("Successfully updated questions json");
				resolve();
			},
		});
		return upload.findPreviousUploads().then((previousUploads) => {
			if (previousUploads.length) {
				upload.resumeFromPreviousUpload(previousUploads[0]);
			}
			upload.start();
		});
	});
};
