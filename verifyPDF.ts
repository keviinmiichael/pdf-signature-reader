import { buildRobustCertificateChain } from './helpers/certsUtils';
import forge from 'node-forge';
import { VerifyPDFError } from './VerifyPDFError';
import extractSignature from './helpers/extractSignature';
import { getMessageFromSignature, checkForSubFilter, preparePDF } from './helpers/general';
import { authenticateSignature, isCertsExpired, setCertificateOptions, clearCustomRootCertificates } from './helpers/verification';
import { validatePdfContent } from './helpers/contentValidation';
import { extractCertificatesDetails } from './certificateDetails';
import { Signature, VerifyPDFResponse } from './types';

const createDigest = (
  authenticatedAttributes: any,
  digestAlgorithm: string
): { digest: string; hashAlgorithm: string } => {
  const hashAlgorithmOid = forge.asn1.derToOid(digestAlgorithm);
  const hashAlgorithm = forge.pki.oids[hashAlgorithmOid].toLowerCase();
  const set = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SET,
    true,
    authenticatedAttributes,
  );

  const md: any = forge.md;
  return {
    digest: md[hashAlgorithm]
      .create()
      .update(forge.asn1.toDer(set).getBytes())
      .digest()
      .getBytes(),
    hashAlgorithm
  };
};

const verify = (
  signature: any,
  signedData: Buffer,
  signatureMeta: any
): Signature => {
  const message = getMessageFromSignature(signature);
  // Acceso seguro a certificates
  const certificates = (message as any).certificates ?? [];
  const {
    rawCapture: {
      signature: sig,
      authenticatedAttributes: attrs,
      digestAlgorithm,
    },
  } = message;

  const { digest, hashAlgorithm } = createDigest(attrs, digestAlgorithm);
  const chainResult = buildRobustCertificateChain(certificates, sig, digest);
  const sortedCerts = chainResult.chain.map((cert: any) => cert.certificate);
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
    .find((attr: any) => forge.asn1.derToOid(attr.value[0].value) === messageDigestAttr);
  const attrDigest = fullAttrDigest.value[1].value[0].value;
  const md: any = forge.md;
  const dataDigest = md[hashAlgorithm]
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

export default async function verifyPDF(
  pdf: Buffer | string,
  options: any = {}
): Promise<VerifyPDFResponse> {
  setCertificateOptions(options);

  try {
    const pdfBuffer = preparePDF(pdf);
    checkForSubFilter(pdfBuffer);

    let contentValidationResult: any = null;
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
        } as VerifyPDFResponse;
      }
    }

    const { signatureStr, signedData, signatureMeta } = extractSignature(pdfBuffer);

    const signatures: Signature[] = signedData.map((signed: Buffer, index: number) =>
      verify(signatureStr[index], signed, signatureMeta[index])
    );

    const result: VerifyPDFResponse = {
      verified: signatures.every(s => s.verified),
      authenticity: signatures.every(s => s.authenticity),
      integrity: signatures.every(s => s.integrity),
      expired: signatures.some(s => s.expired),
      signatures
    };

    if (contentValidationResult) {
      (result as any).contentValidation = contentValidationResult;
    }

    return result;
  } catch (error: any) {
    return {
      verified: false,
      authenticity: false,
      integrity: false,
      expired: false,
      signatures: [],
      message: error.message,
      error
    };
  } finally {
    clearCustomRootCertificates();
  }
}