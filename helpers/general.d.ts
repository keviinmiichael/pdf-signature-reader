import { Buffer } from 'buffer';

export interface SignatureMeta {
    reason: string | null;
    contactInfo: string | null;
    location: string | null;
    name: string | null;
}

export function preparePDF(pdf: Buffer | string): Buffer;
export function checkForSubFilter(pdfBuffer: Buffer): string;
export function getMessageFromSignature(signature: string): any;
export function getSignatureMeta(signedData: Buffer | string): SignatureMeta;
