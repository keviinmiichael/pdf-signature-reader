const forge = require('node-forge');

const issued = (cert) => (anotherCert) => cert !== anotherCert && anotherCert.issued(cert);

const getIssuer = (certsArray) => (cert) => certsArray.find(issued(cert));

const inverse = (f) => (x) => !f(x);

const hasNoIssuer = (certsArray) => inverse(getIssuer(certsArray));

const getChainRootCertificateIdx = (certsArray) => certsArray.findIndex(hasNoIssuer(certsArray));

const isIssuedBy = (cert) => (anotherCert) => cert !== anotherCert && cert.issued(anotherCert);

const getChildIdx = (certsArray) => (parent) => certsArray.findIndex(isIssuedBy(parent));

const sortCertificateChain = (certs) => {
  const certsArray = Array.from(certs);
  const rootCertIndex = getChainRootCertificateIdx(certsArray);
  const certificateChain = certsArray.splice(rootCertIndex, 1);
  while (certsArray.length) {
    const lastCert = certificateChain[0];
    const childCertIdx = getChildIdx(certsArray)(lastCert);
    if (childCertIdx === -1) certsArray.splice(childCertIdx, 1);
    else {
      const [childCert] = certsArray.splice(childCertIdx, 1);
      certificateChain.unshift(childCert);
    }
  }
  return certificateChain;
};

const getClientCertificate = (certs) => sortCertificateChain(certs)[0];

const sortCertificateBySignature = (certificates, signature, authenticatedAttributes, digestAlgorithm) => {
  const certs = [];
  const hashAlgorithmOid = forge.asn1.derToOid(digestAlgorithm);
  const hashAlgorithm = forge.pki.oids[hashAlgorithmOid].toLowerCase();

  const set = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SET,
    true,
    authenticatedAttributes
  );

  const digest = forge.md[hashAlgorithm]
    .create()
    .update(forge.asn1.toDer(set).data)
    .digest()
    .getBytes();

  for (const cert of certificates) {
    try {
      const isValid = cert.publicKey.verify(digest, signature);
      if (isValid) {
        certs.unshift(cert);
      }
    } catch (error) {
      continue;
    }
  }

  const sorted = sortCertificateChain(certificates);
  certs.push(...sorted.filter(cert => !certs.includes(cert)));

  return certs;
};


module.exports = {
  sortCertificateChain,
  getClientCertificate,
  sortCertificateBySignature,
};
