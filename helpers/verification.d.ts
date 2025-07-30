export function authenticateSignature(certs: any[]): boolean;
export function isCertsExpired(certs: any[]): boolean;
export function setCertificateOptions(options?: { caPath?: string; caValidation?: string }): void;
export function clearCustomRootCertificates(): void;
