/**
 * Definiciones de tipos para pdf-signature-reader
 * Estas interfaces describen la estructura de datos que devuelve verifyPDF
 */

/**
 * Información de una entidad (emisor o receptor) de un certificado
 */
export interface CertificateEntity {
  countryName?: string;
  organizationName?: string;
  organizationalUnitName?: string;
  commonName?: string;
  serialNumber?: string;
  givenName?: string;
  surname?: string;
  description?: string;
}

/**
 * Período de validez de un certificado
 */
export interface ValidityPeriod {
  notBefore: string | Date;
  notAfter: string | Date;
}

/**
 * Información detallada de un certificado
 */
export interface CertificateDetails {
  clientCertificate?: boolean;
  issuedBy: CertificateEntity;
  issuedTo: CertificateEntity;
  validityPeriod: ValidityPeriod;
  pemCertificate: string;
}

/**
 * Metadatos de la firma digital
 */
export interface SignatureMeta {
  reason?: string | null;
  contactInfo?: string | null;
  location?: string | null;
  name?: string;
}

/**
 * Metadatos completos de una firma
 */
export interface SignatureMetadata {
  certs: CertificateDetails[];
  signatureMeta: SignatureMeta;
}

/**
 * Información de una firma individual
 */
export interface SignatureInfo {
  verified: boolean;
  authenticity: boolean;
  integrity: boolean;
  expired: boolean;
  meta: SignatureMetadata;
}

/**
 * Respuesta principal de la función verifyPDF
 */
export interface VerifyPDFResponse {
  verified: boolean;
  authenticity: boolean;
  integrity: boolean;
  expired: boolean;
  signatures: SignatureInfo[];
  /** Resultado de validación de contenido (opcional) */
  contentValidation?: ContentValidationResult;
}

/**
 * Respuesta de error de la función verifyPDF
 */
export interface VerifyPDFError {
  verified: false;
  message: string;
  error: Error;
}

/**
 * Tipo unión para el resultado de verifyPDF
 */
export type VerifyPDFResult = VerifyPDFResponse | VerifyPDFError;

/**
 * Modo de validación de certificados
 */
export type CertificateValidationMode = 'all' | 'custom';

/**
 * Tipos de validación de contenido
 */
export type ContentValidationType = 'text';

/**
 * Modos de coincidencia para validación de contenido
 */
export type ContentValidationMatch = 'contains' | 'exact' | 'regex';

/**
 * Configuración de validación de contenido
 */
export interface ContentValidation {
  /** Tipo de validación */
  type: ContentValidationType;
  /** Texto a buscar o validar */
  text: string;
  /** Modo de coincidencia */
  match: ContentValidationMatch;
  /** Descripción opcional para identificar la validación */
  description?: string;
}

/**
 * Resultado de validación de contenido
 */
export interface ContentValidationResult {
  /** Si la validación fue exitosa */
  valid: boolean;
  /** Mensaje de error si la validación falló */
  error?: string;
  /** Validaciones que fallaron */
  failedValidations?: ContentValidation[];
}

/**
 * Opciones de configuración para verifyPDF
 */
export interface VerifyPDFOptions {
  /** Ruta al archivo de certificados CA personalizados */
  caPath?: string;
  /** Modo de validación de certificados (default: 'all') */
  caValidation?: CertificateValidationMode;
  /** Validaciones de contenido del PDF */
  contentValidations?: ContentValidation[];
}

/**
 * Función principal de verificación de PDF
 */
export interface VerifyPDFFunction {
  (pdf: Buffer | string, options?: VerifyPDFOptions): Promise<VerifyPDFResult>;
}

/**
 * Función para obtener información de certificados
 */
export interface GetCertificatesInfoFunction {
  (pdf: Buffer | string): any; // Puedes definir esto más específicamente si conoces la estructura
}

/**
 * Interfaz principal del módulo pdf-signature-reader
 */
export interface PDFSignatureReader extends VerifyPDFFunction {
  getCertificatesInfoFromPDF: GetCertificatesInfoFunction;
}

/**
 * Funciones de utilidad para verificar el tipo de respuesta
 */
export declare function isVerifyPDFSuccess(result: VerifyPDFResult): result is VerifyPDFResponse;
export declare function isVerifyPDFError(result: VerifyPDFResult): result is VerifyPDFError;

declare const verifyPDF: PDFSignatureReader;
export default verifyPDF;
