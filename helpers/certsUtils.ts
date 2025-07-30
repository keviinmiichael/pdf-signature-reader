import forge from 'node-forge';

export function getCertificateName(cert: forge.pki.Certificate): string {
    const cn = cert.subject.getField('CN');
    if (cn) return cn.value;
    const ou = cert.subject.getField('OU');
    if (ou) return ou.value;
    const o = cert.subject.getField('O');
    if (o) return o.value;
    return 'Unknown';
}

export function getIssuerName(cert: forge.pki.Certificate): string {
    const cn = cert.issuer.getField('CN');
    if (cn) return cn.value;
    const ou = cert.issuer.getField('OU');
    if (ou) return ou.value;
    const o = cert.issuer.getField('O');
    if (o) return o.value;
    return 'Unknown';
}

function findSigningCertificate(
    leafCerts: forge.pki.Certificate[],
    signature: string,
    digest: string
): forge.pki.Certificate | null {
    if (leafCerts.length === 1) return leafCerts[0];

    for (const cert of leafCerts) {
        try {
            if ((cert.publicKey as forge.pki.rsa.PublicKey).verify(digest, signature)) {
                return cert;
            }
        } catch (error) {
            continue;
        }
    }
    return null;
}

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
): CertificateChainResult {
    const certsBySubjectHash = new Map<string, forge.pki.Certificate[]>();
    const certsByIssuerHash = new Map<string, forge.pki.Certificate[]>();
    const uniqueCerts: forge.pki.Certificate[] = [];
    const seenKeys = new Set<string>();

    for (const cert of certificates) {
        const key = `${cert.subject.hash}-${cert.issuer.hash}`;
        if (seenKeys.has(key)) continue;

        seenKeys.add(key);
        uniqueCerts.push(cert);

        if (!certsBySubjectHash.has(cert.subject.hash)) {
            certsBySubjectHash.set(cert.subject.hash, []);
        }
        certsBySubjectHash.get(cert.subject.hash)!.push(cert);

        if (!certsByIssuerHash.has(cert.issuer.hash)) {
            certsByIssuerHash.set(cert.issuer.hash, []);
        }
        certsByIssuerHash.get(cert.issuer.hash)!.push(cert);
    }

    const leafCerts = uniqueCerts.filter(cert =>
        !certsByIssuerHash.has(cert.subject.hash)
    );

    if (!leafCerts.length) {
        return {
            chain: [],
            isComplete: false,
            error: 'No leaf certificate found',
            signingCertificate: '',
            rootCertificate: null
        };
    }

    let actualSigningCert = leafCerts[0];
    if (leafCerts.length > 1 && signature && digest) {
        const signingCert = findSigningCertificate(leafCerts, signature, digest);
        if (signingCert) {
            actualSigningCert = signingCert;
        }
    }

    const chain: CertificateChainItem[] = [];
    let currentCert: forge.pki.Certificate | null = actualSigningCert;
    const visitedHashes = new Set<string>();

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
}
