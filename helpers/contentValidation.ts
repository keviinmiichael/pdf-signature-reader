import PDFParser from 'pdf2json';
import { Buffer } from 'buffer';

export interface ContentValidation {
    text: string;
    match?: 'contains' | 'exact' | 'regex';
    description?: string;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
    failedValidations?: ContentValidation[];
}

/**
 * Extrae texto de un buffer PDF
 * @param buffer - Buffer del archivo PDF
 * @returns Texto extraído del PDF
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        const parser = new PDFParser();

        return new Promise((resolve, reject) => {
            parser.on("pdfParser_dataError", (err: any) => {
                reject(err.parserError);
            });

            parser.on("pdfParser_dataReady", (pdfData: any) => {
                try {
                    const texts = pdfData.Pages.flatMap((page: any, pageIndex: number) => {
                        return page.Texts.map((text: any, textIndex: number) => {
                            const decodedText = decodeURIComponent(text.R.map((r: any) => r.T).join(""));
                            return decodedText;
                        });
                    });

                    const fullText = texts.join(" ").replace(/\s+/g, " ").toLowerCase();

                    resolve(fullText);
                } catch (processingError) {
                    reject(processingError);
                }
            });

            parser.parseBuffer(buffer);
        });
    } catch (error) {
        throw error;
    }
}

/**
 * Valida si un texto cumple con los criterios especificados
 * @param pdfText - Texto extraído del PDF
 * @param validation - Configuración de validación
 * @returns true si la validación es exitosa
 */
export function validateSingleContent(pdfText: string, validation: ContentValidation): boolean {
    const { text, match } = validation;
    const searchText = text.toLowerCase();

    switch (match) {
        case 'contains':
            return pdfText.includes(searchText);
        case 'exact':
            return pdfText === searchText;
        case 'regex':
            try {
                const regex = new RegExp(searchText, 'i');
                return regex.test(pdfText);
            } catch (error) {
                return false;
            }
        default:
            return pdfText.includes(searchText);
    }
}

/**
 * Valida el contenido de un PDF contra un array de validaciones
 * @param buffer - Buffer del archivo PDF
 * @param contentValidations - Array de validaciones a aplicar
 * @returns Resultado de la validación
 */
export async function validatePdfContent(buffer: Buffer, contentValidations: ContentValidation[]): Promise<ValidationResult> {
    try {
        if (!contentValidations || !Array.isArray(contentValidations) || contentValidations.length === 0) {
            return { valid: true };
        }

        const pdfText = await extractTextFromPDF(buffer);

        const failedValidations: ContentValidation[] = [];

        for (const validation of contentValidations) {
            if (!validateSingleContent(pdfText, validation)) {
                failedValidations.push(validation);
            }
        }

        if (failedValidations.length > 0) {
            const descriptions = failedValidations.map(v => v.description || v.text).join(', ');
            return {
                valid: false,
                error: `No se encontró el contenido esperado: ${descriptions}`,
                failedValidations
            };
        }

        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: "Error al leer el contenido del PDF",
            failedValidations: []
        };
    }
}
