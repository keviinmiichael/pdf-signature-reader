/// <reference types="./general" />
import { Buffer } from 'buffer';
import { VerifyPDFError } from '../VerifyPDFError';
import { TYPE_PARSE, TYPE_BYTE_RANGE } from '../VerifyPDFError';
import { getSignatureMeta, preparePDF, SignatureMeta } from './general';

const DEFAULT_BYTE_RANGE_PLACEHOLDER = '**********';

interface ByteRangeResult {
    byteRangePlaceholder?: string;
    byteRanges: number[][];
}

function getByteRange(pdfBuffer: Buffer): ByteRangeResult {
    const byteRangeStrings = pdfBuffer.toString().match(/\/ByteRange\s*\[{1}\s*(?:(?:\d*|\/\*{10})\s+){3}(?:\d+|\/\*{10}){1}\s*\]{1}/g);
    if (!byteRangeStrings) {
        throw new VerifyPDFError(
            'Failed to locate ByteRange.',
            TYPE_PARSE,
        );
    }

    const byteRangePlaceholder = byteRangeStrings.find((s) => s.includes(`/${DEFAULT_BYTE_RANGE_PLACEHOLDER}`));
    const strByteRanges = byteRangeStrings.map((brs) => brs.match(/[^[\s]*(?:\d|\/\*{10})/g));

    const byteRanges = strByteRanges.map((n) => (n ?? []).map(Number));

    return {
        byteRangePlaceholder,
        byteRanges,
    };
}

export interface ExtractSignatureResult {
    byteRanges: number[][];
    signatureStr: string[];
    signedData: Buffer[];
    signatureMeta: any[];
}

export default function extractSignature(pdf: Buffer | string): ExtractSignatureResult {
    const pdfBuffer = preparePDF(pdf);

    const { byteRanges } = getByteRange(pdfBuffer);


    const signatureStr: string[] = [];
    const signedData: Buffer[] = [];
    byteRanges.forEach((byteRange) => {
        signedData.push(Buffer.concat([
            pdfBuffer.slice(byteRange[0], byteRange[0] + byteRange[1]),
            pdfBuffer.slice(byteRange[2], byteRange[2] + byteRange[3]),
        ]));

        // Extrae el bloque DER completo de la firma PKCS#7/CMS
        const signatureHex = pdfBuffer.slice(byteRange[0] + byteRange[1] + 1, byteRange[2]).toString('latin1');
        let signatureBuffer = Buffer.from(signatureHex, 'hex');
        // Elimina bytes de padding (0x00) al final
        while (signatureBuffer.length > 0 && signatureBuffer[signatureBuffer.length - 1] === 0x00) {
            signatureBuffer = signatureBuffer.slice(0, -1);
        }
        signatureStr.push(signatureBuffer.toString('binary'));
    });

    const signatureMeta = signedData.map((sd) => getSignatureMeta(sd));

    return {
        byteRanges,
        signatureStr,
        signedData,
        signatureMeta,
    };
}
