import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { parseBulkRegistrationXlsx, type ParseBulkXlsxResult } from '@pip/shared';

interface ValidateBulkUploadRequest {
  fileBase64: string;
}

const MAX_BASE64_LENGTH = Math.ceil((2 * 1024 * 1024 * 4) / 3) + 4;

export const validateBulkUpload = onCall(
  {
    region: 'asia-south1',
    maxInstances: 10,
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  },
  async (request): Promise<ParseBulkXlsxResult> => {
    const data = request.data as ValidateBulkUploadRequest;
    if (!data?.fileBase64 || typeof data.fileBase64 !== 'string') {
      throw new HttpsError('invalid-argument', 'fileBase64 string is required');
    }

    // Clean data URL prefix if sent from browser FileReader
    const base64Content = data.fileBase64.replace(/^data:application\/vnd.*?;base64,/, '');
    if (base64Content.length > MAX_BASE64_LENGTH) {
      throw new HttpsError('invalid-argument', 'Excel file must be 2 MB or smaller.');
    }
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Content)) {
      throw new HttpsError('invalid-argument', 'Excel file encoding is invalid.');
    }

    const result = await parseBulkRegistrationXlsx(base64Content);
    return result;
  }
);
