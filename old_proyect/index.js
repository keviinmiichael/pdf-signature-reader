const verifyPDF = require('./verifyPDF');
const { getCertificatesInfoFromPDF } = require('./certificateDetails');
const types = require('./types');

// Extender la función verifyPDF con funcionalidades adicionales
Object.assign(verifyPDF, { 
  getCertificatesInfoFromPDF,
  
  // Utilidades de tipos
  types: types,
  utils: types.utils,
  Constants: types.Constants,
  
  // Funciones de utilidad directas
  isVerifyPDFSuccess: types.isVerifyPDFSuccess,
  isVerifyPDFError: types.isVerifyPDFError,
  getVerificationSummary: types.getVerificationSummary,
  extractCertificatesInfo: types.extractCertificatesInfo,
  isValidVerifyPDFResponse: types.isValidVerifyPDFResponse
});

module.exports = verifyPDF;
