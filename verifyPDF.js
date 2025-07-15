const forge = require('node-forge');
const VerifyPDFError = require('./VerifyPDFError');
const {
  extractSignature,
  getMessageFromSignature,
  getClientCertificate,
  checkForSubFilter,
  preparePDF,
  authenticateSignature,
  sortCertificateChain,
  isCertsExpired,
  validatePdfContent,
} = require('./helpers');
const { extractCertificatesDetails } = require('./certificateDetails');
const { setCertificateOptions, clearCustomRootCertificates } = require('./helpers/verification');

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
  const hashAlgorithmOid = forge.asn1.derToOid(digestAlgorithm);
  const hashAlgorithm = forge.pki.oids[hashAlgorithmOid].toLowerCase();
  const set = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SET,
    true,
    attrs,
  );
  const clientCertificate = getClientCertificate(certificates);
  const digest = forge.md[hashAlgorithm]
    .create()
    .update(forge.asn1.toDer(set).data)
    .digest()
    .getBytes();
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
  const sortedCerts = sortCertificateChain(certificates);
  const parsedCerts = extractCertificatesDetails(sortedCerts);
  const authenticity = authenticateSignature(sortedCerts);
  const expired = isCertsExpired(sortedCerts);
  return ({
    verified: integrity && authenticity && !expired,
    authenticity,
    integrity,
    expired,
    meta: { certs: parsedCerts, signatureMeta },
  });
};

module.exports = async (pdf, options = {}) => {
  // Configurar certificados con el nuevo formato de opciones
  setCertificateOptions(options);
  
  try {
    const pdfBuffer = preparePDF(pdf);
    checkForSubFilter(pdfBuffer);
    
    // Validar contenido si se proporciona configuración de validación
    let contentValidationResult = null;
    if (options.contentValidations && options.contentValidations.length > 0) {
      contentValidationResult = await validatePdfContent(pdfBuffer, options.contentValidations);
      
      // Si la validación de contenido falla, retornar inmediatamente
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

    const signatures = signedData.map((signed, index) => {
      return (verify(signatureStr[index], signed, signatureMeta[index]));
    })

    const result = {
      verified: signatures.every(o => o.verified === true),
      authenticity: signatures.every(o => o.authenticity === true),
      integrity: signatures.every(o => o.integrity === true),
      expired: signatures.some(o => o.expired === true),
      signatures
    };

    // Agregar resultado de validación de contenido si existe
    if (contentValidationResult) {
      result.contentValidation = contentValidationResult;
    }

    return result;
  } catch (error) {
    return ({ verified: false, message: error.message, error });
  } finally {
    // Limpiar configuración de certificados después de la verificación
    clearCustomRootCertificates();
  }
};
