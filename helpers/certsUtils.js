const forge = require('node-forge');

const getCertificateName = (cert) => {
  const cn = cert.subject.getField('CN');
  if (cn) return cn.value;
  const ou = cert.subject.getField('OU');
  if (ou) return ou.value;
  const o = cert.subject.getField('O');
  if (o) return o.value;
  return 'Unknown';
};

const getIssuerName = (cert) => {
  const cn = cert.issuer.getField('CN');
  if (cn) return cn.value;
  const ou = cert.issuer.getField('OU');
  if (ou) return ou.value;
  const o = cert.issuer.getField('O');
  if (o) return o.value;
  return 'Unknown';
};

const findSigningCertificate = (leafCerts, signature, digest) => {
  if (leafCerts.length === 1) return leafCerts[0];

  for (const cert of leafCerts) {
    try {
      if (cert.publicKey.verify(digest, signature)) {
        return cert;
      }
    } catch (error) {
      continue;
    }
  }
  return null;
};

const buildRobustCertificateChain = (certificates, signature, digest) => {
  const certsBySubjectHash = new Map();
  const certsByIssuerHash = new Map();
  const uniqueCerts = [];
  const seenKeys = new Set();

  for (const cert of certificates) {
    const key = `${cert.subject.hash}-${cert.issuer.hash}`;
    if (seenKeys.has(key)) continue;

    seenKeys.add(key);
    uniqueCerts.push(cert);

    if (!certsBySubjectHash.has(cert.subject.hash)) {
      certsBySubjectHash.set(cert.subject.hash, []);
    }
    certsBySubjectHash.get(cert.subject.hash).push(cert);

    if (!certsByIssuerHash.has(cert.issuer.hash)) {
      certsByIssuerHash.set(cert.issuer.hash, []);
    }
    certsByIssuerHash.get(cert.issuer.hash).push(cert);
  }

  const leafCerts = uniqueCerts.filter(cert =>
    !certsByIssuerHash.has(cert.subject.hash)
  );

  if (!leafCerts.length) {
    return {
      chain: [],
      isComplete: false,
      error: 'No leaf certificate found'
    };
  }

  let actualSigningCert = leafCerts[0];
  if (leafCerts.length > 1 && signature && digest) {
    const signingCert = findSigningCertificate(leafCerts, signature, digest);
    if (signingCert) {
      actualSigningCert = signingCert;
    }
  }

  const chain = [];
  let currentCert = actualSigningCert;
  const visitedHashes = new Set();

  while (currentCert) {
    if (visitedHashes.has(currentCert.subject.hash)) break;
    visitedHashes.add(currentCert.subject.hash);

    const isRoot = currentCert.subject.hash === currentCert.issuer.hash;

    chain.push({
      cert: currentCert.serialNumber,
      certificate: currentCert,
      level: chain.length,
      isRoot: isRoot,
      subjectCN: getCertificateName(currentCert),
      issuerCN: getIssuerName(currentCert),
      isSigningCert: currentCert === actualSigningCert
    });

    if (isRoot) break;

    const issuers = certsBySubjectHash.get(currentCert.issuer.hash);
    currentCert = issuers?.[0] || null;

    if (!currentCert) break;
  }

  const isComplete = chain.length > 0 && chain[chain.length - 1].isRoot;

  return {
    chain,
    isComplete,
    signingCertificate: actualSigningCert.serialNumber,
    rootCertificate: isComplete ? chain[chain.length - 1].cert : null,
  };
};

module.exports = {
  buildRobustCertificateChain,
};
