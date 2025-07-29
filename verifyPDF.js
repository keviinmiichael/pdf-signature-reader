const forge = require('node-forge');
const VerifyPDFError = require('./VerifyPDFError');
const {
  extractSignature,
  getMessageFromSignature,
  checkForSubFilter,
  preparePDF,
  authenticateSignature,
  isCertsExpired,
  validatePdfContent,
  buildRobustCertificateChain,
} = require('./helpers');
const { extractCertificatesDetails } = require('./certificateDetails');
const { setCertificateOptions, clearCustomRootCertificates } = require('./helpers/verification');

const createDigest = (authenticatedAttributes, digestAlgorithm) => {
  const hashAlgorithmOid = forge.asn1.derToOid(digestAlgorithm);
  const hashAlgorithm = forge.pki.oids[hashAlgorithmOid].toLowerCase();
  const set = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SET,
    true,
    authenticatedAttributes,
  );

  return {
    digest: forge.md[hashAlgorithm]
      .create()
      .update(forge.asn1.toDer(set).getBytes())
      .digest()
      .getBytes(),
    hashAlgorithm
  };
};

const verify = (signature, signedData, signatureMeta) => {
  const message = getMessageFromSignature(signature);
  const {
    certificates,
    rawCapture: {
      signature: sig,
      authenticatedAttributes: attrs,
      digestAlgorithm,
    },
  } = message;

  const { digest, hashAlgorithm } = createDigest(attrs, digestAlgorithm);
  const chainResult = buildRobustCertificateChain(certificates, sig, digest);
  const sortedCerts = chainResult.chain.map(cert => cert.certificate);
  const clientCertificate = sortedCerts[0];

  const validAuthenticatedAttributes = clientCertificate.publicKey.verify(digest, sig);
  if (!validAuthenticatedAttributes) {
    throw new VerifyPDFError(
      'Wrong authenticated attributes',
      VerifyPDFError.VERIFY_SIGNATURE,
    );
  }

  const messageDigestAttr = forge.pki.oids.messageDigest;
  const fullAttrDigest = attrs
    .find((attr) => forge.asn1.derToOid(attr.value[0].value) === messageDigestAttr);
  const attrDigest = fullAttrDigest.value[1].value[0].value;
  const dataDigest = forge.md[hashAlgorithm]
    .create()
    .update(signedData.toString('latin1'))
    .digest()
    .getBytes();
  const integrity = dataDigest === attrDigest;

  const parsedCerts = extractCertificatesDetails(sortedCerts);
  const authenticity = authenticateSignature(sortedCerts);
  const expired = isCertsExpired(sortedCerts);

  return {
    verified: integrity && authenticity && !expired,
    authenticity,
    integrity,
    expired,
    meta: {
      certs: parsedCerts,
      signatureMeta,
    },
  };
};

module.exports = async (pdf, options = {}) => {
  setCertificateOptions(options);

  try {
    const pdfBuffer = preparePDF(pdf);
    checkForSubFilter(pdfBuffer);

    let contentValidationResult = null;
    if (options.contentValidations?.length > 0) {
      contentValidationResult = await validatePdfContent(pdfBuffer, options.contentValidations);

      if (!contentValidationResult.valid) {
        return {
          verified: false,
          authenticity: false,
          integrity: false,
          expired: false,
          signatures: [],
          contentValidation: contentValidationResult
        };
      }
    }

    const { signatureStr, signedData, signatureMeta } = extractSignature(pdfBuffer);

    const signatures = signedData.map((signed, index) =>
      verify(signatureStr[index], signed, signatureMeta[index])
    );

    const result = {
      verified: signatures.every(s => s.verified),
      authenticity: signatures.every(s => s.authenticity),
      integrity: signatures.every(s => s.integrity),
      expired: signatures.some(s => s.expired),
      signatures
    };

    if (contentValidationResult) {
      result.contentValidation = contentValidationResult;
    }

    return result;
  } catch (error) {
    return { verified: false, message: error.message, error };
  } finally {
    clearCustomRootCertificates();
  }
};