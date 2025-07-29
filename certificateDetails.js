const forge = require('node-forge');

const {
  extractSignature,
  getMessageFromSignature,
  preparePDF,
} = require('./helpers');

const mapEntityAtrributes = (attrs) => attrs.reduce((agg, { name, value }) => {
  if (!name) return agg;
  agg[name] = value;
  return agg;
}, {});

const extractSingleCertificateDetails = (cert) => {
  const { issuer, subject, validity } = cert;
  return {
    issuedBy: mapEntityAtrributes(issuer.attributes),
    issuedTo: mapEntityAtrributes(subject.attributes),
    validityPeriod: validity,
    pemCertificate: forge.pki.certificateToPem(cert),
  };
};

const extractCertificatesDetails = (certs) => {
  const result = new Array(certs.length);

  for (let i = 0; i < certs.length; i++) {
    const cert = extractSingleCertificateDetails(certs[i]);

    if (i === 0) {
      result[i] = {
        clientCertificate: true,
        ...cert,
      };
    } else {
      result[i] = cert;
    }
  }

  return result;
};

const getCertificatesInfoFromPDF = (pdf) => {
  const pdfBuffer = preparePDF(pdf);
  const { signatureStr } = extractSignature(pdfBuffer);

  const result = new Array(signatureStr.length);

  for (let i = 0; i < signatureStr.length; i++) {
    const { certificates } = getMessageFromSignature(signatureStr[i]);
    result[i] = extractCertificatesDetails(certificates);
  }

  return result;
};

module.exports = {
  extractCertificatesDetails,
  getCertificatesInfoFromPDF,
};
