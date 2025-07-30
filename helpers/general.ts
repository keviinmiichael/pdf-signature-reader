import forge from 'node-forge';
import { Buffer } from 'buffer';
import { VerifyPDFError, TYPE_INPUT, TYPE_PARSE, UNSUPPORTED_SUBFILTER } from '../VerifyPDFError';

export function preparePDF(pdf: Buffer | string): Buffer {
    try {
        if (Buffer.isBuffer(pdf)) return pdf;
        return Buffer.from(pdf);
    } catch (error) {
        throw new VerifyPDFError(
            'PDF expected as Buffer.',
            TYPE_INPUT,
        );
    }
}

export function checkForSubFilter(pdfBuffer: Buffer): string {
    const matches = pdfBuffer.toString().match(/\/SubFilter\s*\/([\w.]*)/);
    const subFilter = Array.isArray(matches) && matches[1];
    if (!subFilter) {
        throw new VerifyPDFError(
            'cannot find subfilter',
            TYPE_PARSE,
        );
    }
    const supportedTypes = ['adbe.pkcs7.detached', 'etsi.cades.detached'];
    if (!supportedTypes.includes(subFilter.trim().toLowerCase())) {
        throw new VerifyPDFError(`subFilter ${subFilter} not supported`, UNSUPPORTED_SUBFILTER);
    }
    return subFilter;
}

export function getMessageFromSignature(signature: string): any {
    const p7Asn1 = forge.asn1.fromDer(signature, false);
    return forge.pkcs7.messageFromAsn1(p7Asn1);
}

function getMetaRegexMatch(keyName: string) {
    return (str: string): string | null => {
        const regex = new RegExp(`/${keyName}\\s*\\(([\\w.\\s@,]*)`, 'g');
        const matches = [...str.matchAll(regex)];
        const meta = matches.length ? matches[matches.length - 1][1] : null;
        return meta;
    };
}

export interface SignatureMeta {
    reason: string | null;
    contactInfo: string | null;
    location: string | null;
    name: string | null;
}

export function getSignatureMeta(signedData: Buffer | string): SignatureMeta {
    const str = Buffer.isBuffer(signedData) ? signedData.toString() : signedData;
    return {
        reason: getMetaRegexMatch('Reason')(str),
        contactInfo: getMetaRegexMatch('ContactInfo')(str),
        location: getMetaRegexMatch('Location')(str),
        name: getMetaRegexMatch('Name')(str),
    };
}
