const tls = require('tls');
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const rootCAs = require('./rootCAs');

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

const getRootCAs = () => {
  const systemCerts = tls.rootCertificates || rootCAs;
  const localCerts = getLocalCertificates();
  
  // Combine system certificates with local certificates
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
};
