const PDFParser = require('pdf2json');

/**
 * Extrae texto de un buffer PDF
 * @param {Buffer} buffer - Buffer del archivo PDF
 * @returns {Promise<string>} Texto extraído del PDF
 */
async function extractTextFromPDF(buffer) {
  try {
    const parser = new PDFParser();

    return new Promise((resolve, reject) => {
      parser.on("pdfParser_dataError", (err) => {
        reject(err.parserError);
      });

      parser.on("pdfParser_dataReady", (pdfData) => {
        try {
          const texts = pdfData.Pages.flatMap((page, pageIndex) => {
            return page.Texts.map((text, textIndex) => {
              const decodedText = decodeURIComponent(text.R.map((r) => r.T).join(""));
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
 * @param {string} pdfText - Texto extraído del PDF
 * @param {Object} validation - Configuración de validación
 * @returns {boolean} true si la validación es exitosa
 */
function validateSingleContent(pdfText, validation) {
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
 * @param {Buffer} buffer - Buffer del archivo PDF
 * @param {Array} contentValidations - Array de validaciones a aplicar
 * @returns {Promise<Object>} Resultado de la validación
 */
async function validatePdfContent(buffer, contentValidations) {
  try {
    if (!contentValidations || !Array.isArray(contentValidations) || contentValidations.length === 0) {
      return { valid: true };
    }

    const pdfText = await extractTextFromPDF(buffer);

    const failedValidations = [];

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

module.exports = {
  extractTextFromPDF,
  validateSingleContent,
  validatePdfContent
};
