/**
 * Utilidades y tipos para pdf-signature-reader
 * Proporciona funciones de utilidad y definiciones de tipos
 */

/**
 * Verifica si el resultado de verifyPDF es exitoso
 * @param {Object} result - Resultado de verifyPDF
 * @returns {boolean} true si es exitoso, false si es error
 */
function isVerifyPDFSuccess(result) {
  return result && typeof result === 'object' && 
         typeof result.verified === 'boolean' && 
         !result.error;
}

/**
 * Verifica si el resultado de verifyPDF es un error
 * @param {Object} result - Resultado de verifyPDF
 * @returns {boolean} true si es error, false si es exitoso
 */
function isVerifyPDFError(result) {
  return result && typeof result === 'object' && 
         result.verified === false && 
         result.error instanceof Error;
}

/**
 * Obtiene información resumida de una respuesta de verifyPDF
 * @param {Object} result - Resultado de verifyPDF
 * @returns {Object} Información resumida
 */
function getVerificationSummary(result) {
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

/**
 * Extrae información de certificados de una respuesta
 * @param {Object} result - Resultado de verifyPDF
 * @returns {Array} Array de información de certificados
 */
function extractCertificatesInfo(result) {
  if (!isVerifyPDFSuccess(result) || !result.signatures) {
    return [];
  }
  
  const certificates = [];
  
  result.signatures.forEach((signature, sigIndex) => {
    if (signature.meta && signature.meta.certs) {
      signature.meta.certs.forEach((cert, certIndex) => {
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

/**
 * Valida si un objeto tiene la estructura de VerifyPDFResponse
 * @param {Object} obj - Objeto a validar
 * @returns {boolean} true si tiene la estructura correcta
 */
function isValidVerifyPDFResponse(obj) {
  if (!obj || typeof obj !== 'object') return false;
  
  const requiredFields = ['verified', 'authenticity', 'integrity', 'expired'];
  const hasRequiredFields = requiredFields.every(field => 
    typeof obj[field] === 'boolean'
  );
  
  if (!hasRequiredFields) return false;
  
  if (obj.signatures && !Array.isArray(obj.signatures)) return false;
  
  if (obj.signatures) {
    return obj.signatures.every(sig => 
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

/**
 * Constantes útiles para trabajar con la librería
 */
const Constants = {
  // Estados de verificación
  VERIFICATION_STATUS: {
    SUCCESS: 'success',
    ERROR: 'error',
    UNKNOWN: 'unknown'
  },
  
  // Tipos de certificados comunes
  CERTIFICATE_TYPES: {
    FNMT: 'FNMT-RCM',
    DNIE: 'DNIE',
    EMPRESA: 'empresa'
  },
  
  // Campos comunes en certificados
  CERTIFICATE_FIELDS: {
    COMMON_NAME: 'commonName',
    ORGANIZATION: 'organizationName',
    COUNTRY: 'countryName',
    SERIAL_NUMBER: 'serialNumber',
    GIVEN_NAME: 'givenName',
    SURNAME: 'surname'
  }
};

module.exports = {
  // Funciones de utilidad
  isVerifyPDFSuccess,
  isVerifyPDFError,
  getVerificationSummary,
  extractCertificatesInfo,
  isValidVerifyPDFResponse,
  
  // Constantes
  Constants,
  
  // Alias para compatibilidad
  utils: {
    isSuccess: isVerifyPDFSuccess,
    isError: isVerifyPDFError,
    getSummary: getVerificationSummary,
    getCertificates: extractCertificatesInfo,
    validate: isValidVerifyPDFResponse
  }
};
