import { Buffer } from 'buffer';

export interface ExtractSignatureResult {
    byteRanges: number[][];
    signatureStr: string[];
    signedData: Buffer[];
    signatureMeta: any[];
}

export default function extractSignature(pdf: Buffer | string): ExtractSignatureResult;
