import forge from 'node-forge';
import helpers from './helpers';
import extractSignature from './helpers/extractSignature';
import { getMessageFromSignature, preparePDF } from './helpers/general';

interface EntityAttribute {
    name: string;
    value: string;
}

interface CertificateValidity {
    notBefore: Date;
    notAfter: Date;
}

interface CertificateDetails {
    issuedBy: Record<string, string>;
    issuedTo: Record<string, string>;
    validityPeriod: string;
    pemCertificate: string;
}

function mapEntityAtrributes(attrs: EntityAttribute[]): Record<string, string> {
    return attrs.reduce((agg, { name, value }) => {
        if (!name) return agg;
        agg[name] = value;
        return agg;
    }, {} as Record<string, string>);
}

function extractSingleCertificateDetails(cert: any): CertificateDetails {
    const { issuer, subject, validity } = cert;
    let validityPeriod = '';
    if (validity && validity.notBefore && validity.notAfter) {
        const start = validity.notBefore instanceof Date ? validity.notBefore.toISOString().slice(0, 10) : String(validity.notBefore);
        const end = validity.notAfter instanceof Date ? validity.notAfter.toISOString().slice(0, 10) : String(validity.notAfter);
        validityPeriod = `${start} a ${end}`;
    }
    return {
        issuedBy: mapEntityAtrributes(issuer.attributes),
        issuedTo: mapEntityAtrributes(subject.attributes),
        validityPeriod,
        pemCertificate: forge.pki.certificateToPem(cert),
    };
}

export function extractCertificatesDetails(certs: any[]): (CertificateDetails & { clientCertificate?: boolean })[] {
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
}

export function getCertificatesInfoFromPDF(pdf: Buffer | string): (CertificateDetails & { clientCertificate?: boolean })[][] {
    const pdfBuffer = preparePDF(pdf);
    const { signatureStr } = extractSignature(pdfBuffer);

    const result = new Array(signatureStr.length);

    for (let i = 0; i < signatureStr.length; i++) {
        const { certificates } = getMessageFromSignature(signatureStr[i]);
        result[i] = extractCertificatesDetails(certificates);
    }

    return result;
}
