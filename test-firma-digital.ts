import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import verifyPDF from './verifyPDF';

const TEST_DIR = './CERTIFICADOS_TEST';
const PEM_PATH = './certs_backup/fnmt.pem';

// Cargar y filtrar certificados válidos de fnmt.pem
const pemData: string = fs.readFileSync(PEM_PATH, 'utf8');
const pemBlocks: string[] = pemData.split('-----END CERTIFICATE-----')
    .map(block => block.trim())
    .filter(block => block.length > 0)
    .map(block => block + '\n-----END CERTIFICATE-----');

const trustedCerts: forge.pki.Certificate[] = [];
for (const pem of pemBlocks) {
    try {
        if (pem.startsWith('-----BEGIN CERTIFICATE-----') && pem.length > 1000) {
            trustedCerts.push(forge.pki.certificateFromPem(pem));
        }
    } catch (e) {
        // Ignorar bloques corruptos
    }
}

console.log(`Certificados raíz/intermedios válidos: ${trustedCerts.length}`);

async function testSoloFirmaDigital(pdfPath: string, trustedCerts: forge.pki.Certificate[]): Promise<any> {
    try {
        const pdfBuffer = fs.readFileSync(pdfPath);
        // Usar verifyPDF con opciones para solo validar firma digital y cadena
        const resultado = await verifyPDF(pdfBuffer, {
            caValidation: 'custom',
            caPath: PEM_PATH
        });
        return resultado;
    } catch (e: any) {
        return { error: e.message };
    }
}

async function main(): Promise<void> {
    const files = fs.readdirSync(TEST_DIR).filter(f => f.endsWith('.pdf'));
    console.log('🧪 TEST SOLO FIRMA DIGITAL usando fnmt.pem como confianza');
    for (const file of files) {
        const pdfPath = path.join(TEST_DIR, file);
        const resultado = await testSoloFirmaDigital(pdfPath, trustedCerts);
        console.log(`\n📄 ${file}`);
        if (resultado.error) {
            console.log(`   ⚠️ ${resultado.error}`);
        } else if (resultado.signatures && resultado.signatures.length) {
            resultado.signatures.forEach((firma: any, idx: number) => {
                console.log(`   Firma #${idx + 1}: ${firma.verified ? '✅ VÁLIDA' : '❌ INVÁLIDA'} | Cadena: ${firma.authenticity ? '🔒 AUTÉNTICA' : '⚠️ NO AUTÉNTICA'}`);
            });
        } else {
            console.log('   ⚠️ No se encontraron firmas en el PDF');
        }
    }
}

main();