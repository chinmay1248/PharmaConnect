import { postJson } from './api';
import type { CustomerSession, PrescriptionUpload } from '../screens/customer/customerTypes';

type UploadPrescriptionResponse = {
  upload: PrescriptionUpload;
};

type UploadPrescriptionPayload = {
  customerId: string;
  medicineId?: string;
  source: 'camera' | 'gallery';
  originalFileName?: string;
  contentBase64?: string;
  mimeType?: string;
};

const placeholderPrescriptionBase64 =
  'UGhhcm1hQ29ubmVjdCBwcmVzY3JpcHRpb24gdXBsb2FkIHBsYWNlaG9sZGVyIGZvciBkZXZlbG9wbWVudC4K';

type BrowserFileSelection = {
  originalFileName: string;
  contentBase64: string;
  mimeType: string;
};

type BrowserFile = {
  name: string;
  type: string;
};

type BrowserFileReader = {
  result: string | ArrayBuffer | null;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  readAsDataURL: (file: BrowserFile) => void;
};

function getBrowserFileApis() {
  return globalThis as typeof globalThis & {
    document?: {
      createElement: (tagName: 'input') => {
        type: string;
        accept: string;
        style: { display: string };
        files?: ArrayLike<BrowserFile> | null;
        onchange: (() => void) | null;
        oncancel?: (() => void) | null;
        click: () => void;
        remove: () => void;
        setAttribute: (name: string, value: string) => void;
      };
      body?: {
        appendChild: (node: unknown) => void;
      };
    };
    FileReader?: new () => BrowserFileReader;
  };
}

function readBrowserFileAsBase64(file: BrowserFile) {
  const browserApis = getBrowserFileApis();

  if (!browserApis.FileReader) {
    return Promise.reject(new Error('FileReader is not available in this environment.'));
  }

  return new Promise<BrowserFileSelection>((resolve, reject) => {
    const FileReaderCtor = browserApis.FileReader as new () => BrowserFileReader;
    const reader = new FileReaderCtor();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const [, contentBase64 = ''] = result.split(',');

      if (!contentBase64) {
        reject(new Error('The selected prescription file could not be read.'));
        return;
      }

      resolve({
        originalFileName: file.name || `prescription-${Date.now()}`,
        contentBase64,
        mimeType: file.type || 'application/octet-stream',
      });
    };
    reader.onerror = () => reject(new Error('The selected prescription file could not be read.'));
    reader.readAsDataURL(file);
  });
}

function pickBrowserPrescriptionFile(source: 'camera' | 'gallery') {
  const browserApis = getBrowserFileApis();

  if (!browserApis.document?.body) {
    return Promise.resolve<BrowserFileSelection | null>(null);
  }

  return new Promise<BrowserFileSelection | null>((resolve, reject) => {
    const input = browserApis.document!.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.style.display = 'none';

    if (source === 'camera') {
      input.setAttribute('capture', 'environment');
    }

    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();

      if (!file) {
        resolve(null);
        return;
      }

      readBrowserFileAsBase64(file).then(resolve).catch(reject);
    };
    input.oncancel = () => {
      input.remove();
      resolve(null);
    };

    browserApis.document!.body!.appendChild(input);
    input.click();
  });
}

function buildLocalPrescriptionUpload(
  medicineId: string,
  source: 'camera' | 'gallery',
  customerId = 'local-customer',
): PrescriptionUpload {
  const fileName = `prescription-${source}-${Date.now()}.txt`;

  return {
    fileUrl: `https://example.com/pharmaconnect/prescriptions/${customerId}/${fileName}`,
    originalFileName: fileName,
    source,
    uploadedAt: new Date().toISOString(),
    medicineId,
    mimeType: 'text/plain',
  };
}

export async function uploadCustomerPrescription(
  input: {
    customerSession?: CustomerSession | null;
    medicineId: string;
    source: 'camera' | 'gallery';
  },
): Promise<PrescriptionUpload> {
  const customerId = input.customerSession?.user.id;
  const selectedFile = await pickBrowserPrescriptionFile(input.source);

  if (!customerId) {
    return selectedFile
      ? {
          fileUrl: `local://${selectedFile.originalFileName}`,
          originalFileName: selectedFile.originalFileName,
          source: input.source,
          uploadedAt: new Date().toISOString(),
          medicineId: input.medicineId,
          mimeType: selectedFile.mimeType,
        }
      : buildLocalPrescriptionUpload(input.medicineId, input.source);
  }

  const payload: UploadPrescriptionPayload = {
    customerId,
    medicineId: input.medicineId,
    source: input.source,
    originalFileName: selectedFile?.originalFileName ?? `prescription-${input.source}-${Date.now()}.txt`,
    contentBase64: selectedFile?.contentBase64 ?? placeholderPrescriptionBase64,
    mimeType: selectedFile?.mimeType ?? 'text/plain',
  };

  const response = await postJson<UploadPrescriptionResponse, UploadPrescriptionPayload>(
    '/prescriptions/uploads',
    payload,
  );

  return response.upload;
}
