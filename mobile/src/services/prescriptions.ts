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
};

function buildLocalPrescriptionUpload(
  medicineId: string,
  source: 'camera' | 'gallery',
  customerId = 'local-customer',
): PrescriptionUpload {
  const fileName = `prescription-${source}-${Date.now()}.jpg`;

  return {
    fileUrl: `https://example.com/pharmaconnect/prescriptions/${customerId}/${fileName}`,
    originalFileName: fileName,
    source,
    uploadedAt: new Date().toISOString(),
    medicineId,
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

  if (!customerId) {
    return buildLocalPrescriptionUpload(input.medicineId, input.source);
  }

  const payload: UploadPrescriptionPayload = {
    customerId,
    medicineId: input.medicineId,
    source: input.source,
    originalFileName: `prescription-${input.source}-${Date.now()}.jpg`,
  };

  const response = await postJson<UploadPrescriptionResponse, UploadPrescriptionPayload>(
    '/prescriptions/uploads',
    payload,
  );

  return response.upload;
}
