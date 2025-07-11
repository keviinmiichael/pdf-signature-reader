const tls = require('tls');
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const rootCAs = require('./rootCAs');

// Variable global para almacenar certificados personalizados
let customRootCertificates = null;

const getLocalCertificates = () => {
  try {
    const certsPath = path.join(__dirname, '..', 'certs');
    const fnmtPath = path.join(certsPath, 'fnmt.pem');
    
    if (fs.existsSync(fnmtPath)) {
      const localCerts = fs.readFileSync(fnmtPath, 'utf8');
      // Split multiple certificates if they exist in the same file
      const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
      const matches = localCerts.match(certRegex);
      return matches || [];
    }
    return [];
  } catch (error) {
    console.warn('Warning: Could not load local certificates:', error.message);
    return [];
  }
};

const loadCustomRootCertificates = (customRootCAPath) => {
  try {
    if (!customRootCAPath || !fs.existsSync(customRootCAPath)) {
      throw new Error(`Custom root CA file not found: ${customRootCAPath}`);
    }
    
    const customCerts = fs.readFileSync(customRootCAPath, 'utf8');

    const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
    const matches = customCerts.match(certRegex);
    
    if (!matches || matches.length === 0) {
      throw new Error(`No valid certificates found in: ${customRootCAPath}`);
    }
    
    return matches;
  } catch (error) {
    console.warn('Warning: Could not load custom root certificates:', error.message);
    return [];
  }
};

const setCustomRootCertificates = (customRootCAPath) => {
  if (customRootCAPath) {
    customRootCertificates = loadCustomRootCertificates(customRootCAPath);
  } else {
    customRootCertificates = null;
  }
};

const clearCustomRootCertificates = () => {
  customRootCertificates = null;
};

const getRootCAs = () => {
  if (customRootCertificates && customRootCertificates.length > 0) {
    return customRootCertificates;
  }
  
  const systemCerts = tls.rootCertificates || rootCAs;
  const localCerts = getLocalCertificates();
  return [...systemCerts, ...localCerts];
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
  setCustomRootCertificates,
  clearCustomRootCertificates,
  getRootCAs, // Exportar para testing
};
