const tls = require('tls');
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

let customRootCertificates = null;
let caValidationMode = 'all';

const loadCustomRootCertificates = (caPath) => {
  try {
    if (!caPath || !fs.existsSync(caPath)) {
      throw new Error(`Custom root CA file not found: ${caPath}`);
    }
    
    const customCerts = fs.readFileSync(caPath, 'utf8');

    const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
    const matches = customCerts.match(certRegex);
    
    if (!matches || matches.length === 0) {
      throw new Error(`No valid certificates found in: ${caPath}`);
    }
    
    return matches;
  } catch (error) {
    console.warn('Warning: Could not load custom root certificates:', error.message);
    return [];
  }
};

const setCertificateOptions = (options = {}) => {
  const { caPath, caValidation = 'all' } = options;
  
  caValidationMode = caValidation;
  
  if (caPath) {
    customRootCertificates = loadCustomRootCertificates(caPath);
  } else {
    customRootCertificates = null;
  }
};

const clearCustomRootCertificates = () => {
  customRootCertificates = null;
  caValidationMode = 'all';
};

const getRootCAs = () => {
  if (caValidationMode === 'custom') {
    return customRootCertificates || [];
  }
  
  const systemCerts = tls.rootCertificates;
  
  if (customRootCertificates && customRootCertificates.length > 0) {
    return [...systemCerts, ...customRootCertificates];
  }
  
  return systemCerts;
};

const verifyRootCert = (chainRootInForgeFormat) => !!getRootCAs()
  .find((rootCAInPem) => {
    try {
      const rootCAInForgeCert = forge.pki.certificateFromPem(rootCAInPem);
      return forge.pki.certificateToPem(chainRootInForgeFormat) === rootCAInPem
      || rootCAInForgeCert.issued(chainRootInForgeFormat);
    } catch (e) {
      return false;
    }
  });

const verifyCaBundle = (certs) => !!certs
  .find((cert, i) => certs[i + 1] && certs[i + 1].issued(cert));

const isCertsExpired = (certs) => !!certs
  .find(({ validity: { notAfter, notBefore } }) => notAfter.getTime() < Date.now()
  || notBefore.getTime() > Date.now());

const authenticateSignature = (certs) => verifyCaBundle(certs)
&& verifyRootCert(certs[certs.length - 1]);

module.exports = {
  authenticateSignature,
  verifyCaBundle,
  verifyRootCert,
  isCertsExpired,
  setCertificateOptions,
  clearCustomRootCertificates,
  getRootCAs, // Exportar para testing
};
