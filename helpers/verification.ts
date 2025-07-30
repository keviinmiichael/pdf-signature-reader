import { Buffer } from 'buffer';
import tls from 'tls';
import forge from 'node-forge';
import fs from 'fs';
import path from 'path';

let customRootCertificates: string[] | null = null;
let caValidationMode: string = 'all';

function loadCustomRootCertificates(caPath: string): string[] {
    try {
        if (!caPath || !fs.existsSync(caPath)) {
            throw new Error(`Custom root CA file not found: ${caPath}`);
        }
        const customCerts = fs.readFileSync(caPath, 'utf8');
        const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
        const matches = customCerts.match(certRegex);
        if (!matches || matches.length === 0) {
            throw new Error(`No valid certificates found in: ${caPath}`);
        }
        return matches;
    } catch (error: any) {
        console.warn('Warning: Could not load custom root certificates:', error.message);
        return [];
    }
}

export function setCertificateOptions(options: { caPath?: string; caValidation?: string } = {}): void {
    const { caPath, caValidation = 'all' } = options;
    caValidationMode = caValidation;
    if (caPath) {
        customRootCertificates = loadCustomRootCertificates(caPath);
    } else {
        customRootCertificates = null;
    }
}

export function clearCustomRootCertificates(): void {
    customRootCertificates = null;
    caValidationMode = 'all';
}

export function getRootCAs(): string[] {
    if (caValidationMode === 'custom') {
        return customRootCertificates || [];
    }
    const systemCerts = tls.rootCertificates;
    if (customRootCertificates && customRootCertificates.length > 0) {
        return [...Array.from(systemCerts), ...customRootCertificates];
    }
    return Array.from(systemCerts);
}

export function verifyRootCert(chainRootInForgeFormat: forge.pki.Certificate): boolean {
    return !!getRootCAs().find((rootCAInPem) => {
        try {
            const rootCAInForgeCert = forge.pki.certificateFromPem(rootCAInPem);
            return forge.pki.certificateToPem(chainRootInForgeFormat) === rootCAInPem
                || rootCAInForgeCert.issued(chainRootInForgeFormat);
        } catch (e) {
            return false;
        }
    });
}

export function verifyCaBundle(certs: forge.pki.Certificate[]): boolean {
    return !!certs.find((cert, i) => certs[i + 1] && certs[i + 1].issued(cert));
}

export function isCertsExpired(certs: forge.pki.Certificate[]): boolean {
    return !!certs.find(({ validity: { notAfter, notBefore } }) =>
        notAfter.getTime() < Date.now() || notBefore.getTime() > Date.now()
    );
}

export function authenticateSignature(certs: forge.pki.Certificate[]): boolean {
    return verifyCaBundle(certs) && verifyRootCert(certs[certs.length - 1]);
}
