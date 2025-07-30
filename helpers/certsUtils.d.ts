import forge from 'node-forge';

export interface CertificateChainItem {
    cert: string;
    certificate: forge.pki.Certificate;
    level: number;
    isRoot: boolean;
    subjectCN: string;
    issuerCN: string;
    isSigningCert: boolean;
}

export interface CertificateChainResult {
    chain: CertificateChainItem[];
    isComplete: boolean;
    signingCertificate: string;
    rootCertificate: string | null;
    error?: string;
}

export function buildRobustCertificateChain(
    certificates: forge.pki.Certificate[],
    signature?: string,
    digest?: string
): CertificateChainResult;
