/**
 * Utilidades y tipos para pdf-signature-reader
 * Proporciona funciones de utilidad y definiciones de tipos
 */

// Tipos para la respuesta de verifyPDF
export interface CertificateInfo {
  clientCertificate?: boolean;
  issuedBy?: {
    organizationName?: string;
    commonName?: string;
    countryName?: string;
  };
  issuedTo?: {
    commonName?: string;
    organizationName?: string;
    countryName?: string;
    serialNumber?: string;
    givenName?: string;
    surname?: string;
  };
  validityPeriod?: string;
}

export interface SignatureMeta {
  signatureMeta?: {
    name?: string;
  };
  certs?: CertificateInfo[];
}

export interface Signature {
  verified: boolean;
  authenticity: boolean;
  integrity: boolean;
  expired: boolean;
  meta?: SignatureMeta;
}

export interface VerifyPDFResponse {
  verified: boolean;
  authenticity: boolean;
  integrity: boolean;
  expired: boolean;
  signatures?: Signature[];
  error?: Error;
  message?: string;
}

export function isVerifyPDFSuccess(result: any): result is VerifyPDFResponse {
  return result && typeof result === 'object' &&
    typeof result.verified === 'boolean' &&
    !result.error;
}

export function isVerifyPDFError(result: any): boolean {
  return result && typeof result === 'object' &&
    result.verified === false &&
    result.error instanceof Error;
}

export function getVerificationSummary(result: any): {
  status: string;
  message?: string;
  verified: boolean;
  authenticity?: boolean;
  integrity?: boolean;
  expired?: boolean;
  signaturesCount: number;
  signatures?: Array<{
    index: number;
    verified: boolean;
    authenticity: boolean;
    integrity: boolean;
    expired: boolean;
    signer: string;
    certificatesCount: number;
  }>;
} {
  if (isVerifyPDFError(result)) {
    return {
      status: 'error',
      message: result.message,
      verified: false,
      signaturesCount: 0
    };
  }

  if (isVerifyPDFSuccess(result)) {
    return {
      status: 'success',
      verified: result.verified,
      authenticity: result.authenticity,
      integrity: result.integrity,
      expired: result.expired,
      signaturesCount: result.signatures ? result.signatures.length : 0,
      signatures: result.signatures ? result.signatures.map((sig, index) => ({
        index,
        verified: sig.verified,
        authenticity: sig.authenticity,
        integrity: sig.integrity,
        expired: sig.expired,
        signer: sig.meta?.signatureMeta?.name || 'Unknown',
        certificatesCount: sig.meta?.certs?.length || 0
      })) : []
    };
  }

  return {
    status: 'unknown',
    verified: false,
    signaturesCount: 0
  };
}

export function extractCertificatesInfo(result: any): Array<{
  signatureIndex: number;
  certificateIndex: number;
  isClientCertificate: boolean;
  issuer?: any;
  subject?: any;
  validity?: string;
  commonName?: string;
  organization?: string;
  country?: string;
  serialNumber?: string;
  issuerOrganization?: string;
  issuerCommonName?: string;
}> {
  if (!isVerifyPDFSuccess(result) || !result.signatures) {
    return [];
  }

  const certificates: Array<any> = [];

  result.signatures.forEach((signature: Signature, sigIndex: number) => {
    if (signature.meta && signature.meta.certs) {
      signature.meta.certs.forEach((cert: CertificateInfo, certIndex: number) => {
        certificates.push({
          signatureIndex: sigIndex,
          certificateIndex: certIndex,
          isClientCertificate: cert.clientCertificate || false,
          issuer: cert.issuedBy,
          subject: cert.issuedTo,
          validity: cert.validityPeriod,
          commonName: cert.issuedTo?.commonName,
          organization: cert.issuedTo?.organizationName,
          country: cert.issuedTo?.countryName,
          serialNumber: cert.issuedTo?.serialNumber,
          issuerOrganization: cert.issuedBy?.organizationName,
          issuerCommonName: cert.issuedBy?.commonName
        });
      });
    }
  });

  return certificates;
}

export function isValidVerifyPDFResponse(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;

  const requiredFields = ['verified', 'authenticity', 'integrity', 'expired'];
  const hasRequiredFields = requiredFields.every(field =>
    typeof obj[field] === 'boolean'
  );

  if (!hasRequiredFields) return false;

  if (obj.signatures && !Array.isArray(obj.signatures)) return false;

  if (obj.signatures) {
    return obj.signatures.every((sig: any) =>
      sig && typeof sig === 'object' &&
      typeof sig.verified === 'boolean' &&
      typeof sig.authenticity === 'boolean' &&
      typeof sig.integrity === 'boolean' &&
      typeof sig.expired === 'boolean' &&
      sig.meta && typeof sig.meta === 'object'
    );
  }

  return true;
}

export const Constants = {
  VERIFICATION_STATUS: {
    SUCCESS: 'success',
    ERROR: 'error',
    UNKNOWN: 'unknown'
  },
  CERTIFICATE_TYPES: {
    FNMT: 'FNMT-RCM',
    DNIE: 'DNIE',
    EMPRESA: 'empresa'
  },
  CERTIFICATE_FIELDS: {
    COMMON_NAME: 'commonName',
    ORGANIZATION: 'organizationName',
    COUNTRY: 'countryName',
    SERIAL_NUMBER: 'serialNumber',
    GIVEN_NAME: 'givenName',
    SURNAME: 'surname'
  }
};

export const utils = {
  isSuccess: isVerifyPDFSuccess,
  isError: isVerifyPDFError,
  getSummary: getVerificationSummary,
  getCertificates: extractCertificatesInfo,
  validate: isValidVerifyPDFResponse
};