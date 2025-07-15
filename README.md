# PDF Signature Reader

A comprehensive Node.js library for verifying digital signatures in PDF documents with enhanced support for Spanish certificates (FNMT, DNIe, corporate certificates) and advanced content validation capabilities.

## ✨ Features

- 🔐 **Complete PDF signature verification** with certificate chain validation
- 🇪🇸 **Enhanced Spanish certificate support** (FNMT-RCM, DNIe, corporate certificates)
- 📋 **Content validation** - Verify PDF content before signature verification
- 🛡️ **Flexible certificate validation** (system certificates, custom CA, hybrid mode)
- 📊 **Comprehensive error handling** with detailed error types
- 🔄 **Async/Promise support** for modern JavaScript applications
- 📝 **TypeScript definitions** included
- ⚡ **High performance** with optimized PDF processing

## 🚀 Installation

```bash
npm install pdf-signature-reader-sl
```

## 📖 Quick Start

### Basic PDF Signature Verification

```javascript
const verifyPDF = require("pdf-signature-reader-sl");
const fs = require("fs");

async function verifyDocument() {
  const pdfBuffer = fs.readFileSync("signed-document.pdf");

  const result = await verifyPDF(pdfBuffer);

  if (result.verified) {
    console.log("✅ PDF signature is valid");
    console.log(`📋 Found ${result.signatures.length} signatures`);
  } else {
    console.log("❌ PDF signature verification failed");
  }
}
```

### PDF Verification with Content Validation

```javascript
async function verifyWithContent() {
  const pdfBuffer = fs.readFileSync("document.pdf");

  const result = await verifyPDF(pdfBuffer, {
    contentValidations: [
      {
        type: "text",
        text: "Required Company Name",
        match: "contains",
        description: "COMPANY_NAME",
      },
      {
        type: "text",
        text: "contact@company.com",
        match: "contains",
        description: "CONTACT_EMAIL",
      },
    ],
  });

  // Content validation runs BEFORE signature verification
  if (result.contentValidation && !result.contentValidation.valid) {
    console.log(
      "❌ Content validation failed:",
      result.contentValidation.error
    );
    return;
  }

  if (result.verified) {
    console.log("✅ Document verified: content and signature are valid");
  }
}
```

## 📚 API Reference

### Main Function: `verifyPDF`

**Signature**: `verifyPDF(pdf, options?) => Promise<VerifyPDFResponse | VerifyPDFError>`

**Parameters**:

- `pdf` (`Buffer | string`): PDF file as buffer or file path string
- `options` (`VerifyPDFOptions`, optional): Configuration options

**Returns**: Promise that resolves to verification result

#### VerifyPDFOptions

```typescript
interface VerifyPDFOptions {
  // Certificate validation options
  caPath?: string; // Path to custom CA certificates file
  caValidation?: "all" | "custom"; // Certificate validation mode (default: 'all')

  // Content validation options (NEW)
  contentValidations?: ContentValidation[]; // Array of content validation rules
}

interface ContentValidation {
  type: "text"; // Validation type
  text: string; // Text to search for
  match: "contains" | "exact" | "regex"; // Match type
  description?: string; // Optional description for error messages
}
```

#### Success Response

```typescript
interface VerifyPDFResponse {
  verified: boolean; // Overall verification status (content + signature)
  authenticity: boolean; // Certificate chain is trusted
  integrity: boolean; // Document hasn't been modified
  expired: boolean; // Any certificate in chain is expired
  signatures: SignatureInfo[]; // Array of individual signature details

  // Content validation result (optional)
  contentValidation?: {
    valid: boolean;
    error?: string;
    failedValidations?: ContentValidation[];
  };
}
```

#### Error Response

```typescript
interface VerifyPDFError {
  verified: false;
  message: string; // Human-readable error description
  error: Error; // Original error object
}
```

## ⚙️ Configuration Options

### Certificate Validation Modes

#### `caValidation: 'all'` (default)

Uses system root certificates plus custom certificates if `caPath` is provided.

```javascript
// System certificates only
const result = await verifyPDF(pdfBuffer);

// System + custom certificates
const result = await verifyPDF(pdfBuffer, {
  caPath: "./certs/custom-ca.pem",
  caValidation: "all",
});
```

#### `caValidation: 'custom'`

Uses only custom certificates from `caPath`, ignoring system certificates.

```javascript
const result = await verifyPDF(pdfBuffer, {
  caPath: "./certs/custom-ca.pem",
  caValidation: "custom",
});
```

### Content Validation

Content validation allows you to verify that specific text exists in the PDF **before** signature verification. This is useful for ensuring documents contain required information.

**Match Types:**

- `'contains'`: Text must appear anywhere in the PDF content
- `'exact'`: Text must match exactly (case-insensitive)
- `'regex'`: Text is treated as a regular expression pattern

**Validation Flow:**

1. PDF content is extracted and converted to lowercase text
2. Each validation rule is checked sequentially
3. If any validation fails, the process stops and returns immediately
4. Only if all content validations pass, signature verification proceeds

```javascript
const result = await verifyPDF(pdfBuffer, {
  contentValidations: [
    {
      type: "text",
      text: "company registration number",
      match: "contains",
      description: "REGISTRATION_INFO",
    },
    {
      type: "text",
      text: "^contract.*d{4}$",
      match: "regex",
      description: "CONTRACT_NUMBER_PATTERN",
    },
  ],
});

if (!result.contentValidation?.valid) {
  console.log("Content validation failed:", result.contentValidation.error);
  return; // Stop processing
}
```

## 💡 Advanced Examples

### Document Representation Validation

```javascript
const verifyPDF = require("pdf-signature-reader-sl");

async function validateRepresentationDocument(pdfBuffer, onboardingData) {
  // Define required content validations
  const contentValidations = [
    {
      type: "text",
      text: "modelo de otorgamiento de la representación directa",
      match: "contains",
      description: "DOCUMENT_TYPE",
    },
    {
      type: "text",
      text: "agencia estatal de administración tributaria",
      match: "contains",
      description: "TAX_AGENCY",
    },
    {
      type: "text",
      text: onboardingData.legalAgent?.nif?.toLowerCase(),
      match: "contains",
      description: "LEGAL_AGENT_NIF",
    },
    {
      type: "text",
      text: "ley general tributaria (ley 58/2003)",
      match: "contains",
      description: "LEGAL_FRAMEWORK",
    },
  ];

  try {
    const result = await verifyPDF(pdfBuffer, {
      caPath: "./certs/spanish-ca.pem",
      caValidation: "custom",
      contentValidations,
    });

    // Check content validation first
    if (result.contentValidation && !result.contentValidation.valid) {
      return {
        success: false,
        reason: "content_validation_failed",
        error: result.contentValidation.error,
        failedValidations: result.contentValidation.failedValidations,
      };
    }

    // Check signature verification
    if (!result.verified) {
      return {
        success: false,
        reason: "signature_invalid",
        authenticity: result.authenticity,
        integrity: result.integrity,
        expired: result.expired,
      };
    }

    return {
      success: true,
      signatures: result.signatures.length,
      certificateInfo: result.signatures[0]?.meta?.certs,
    };
  } catch (error) {
    return {
      success: false,
      reason: "processing_error",
      error: error.message,
    };
  }
}
```

### Certificate Information Extraction

```javascript
async function getCertificateDetails(pdfBuffer) {
  // Get certificate information without full verification
  const certInfo = verifyPDF.getCertificatesInfoFromPDF(pdfBuffer);

  certInfo.forEach((signatureCerts, sigIndex) => {
    console.log(`Signature ${sigIndex + 1}:`);

    signatureCerts.forEach((cert) => {
      if (cert.clientCertificate) {
        console.log(`  Signer: ${cert.issuedTo.commonName}`);
        console.log(`  Organization: ${cert.issuedTo.organizationName}`);
        console.log(`  Country: ${cert.issuedTo.countryName}`);
        console.log(`  Valid until: ${cert.validityPeriod.notAfter}`);
      }
    });
  });
}
```

### Error Handling Best Practices

```javascript
async function robustPDFVerification(pdfBuffer, options = {}) {
  try {
    const result = await verifyPDF(pdfBuffer, options);

    // Type-safe error checking
    if (verifyPDF.isVerifyPDFError(result)) {
      console.error("Verification failed:", result.message);
      return { status: "error", message: result.message };
    }

    // Content validation check
    if (result.contentValidation && !result.contentValidation.valid) {
      console.warn(
        "Content validation failed:",
        result.contentValidation.error
      );
      return {
        status: "content_invalid",
        details: result.contentValidation.failedValidations,
      };
    }

    // Signature validation details
    if (!result.verified) {
      const issues = [];
      if (!result.authenticity) issues.push("Certificate chain not trusted");
      if (!result.integrity) issues.push("Document has been modified");
      if (result.expired) issues.push("Certificate has expired");

      return { status: "signature_invalid", issues };
    }

    return {
      status: "valid",
      signatures: result.signatures.length,
      details: result,
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { status: "processing_error", error: error.message };
  }
}
```

## 🔧 Utility Functions

### Certificate Information

#### `getCertificatesInfoFromPDF(pdf)`

Extracts certificate details from PDF without performing verification.

```javascript
const certInfo = verifyPDF.getCertificatesInfoFromPDF(pdfBuffer);
// Returns: Array<Array<CertificateDetails>>
```

### Type Guards

#### `isVerifyPDFSuccess(result)` / `isVerifyPDFError(result)`

Type-safe checking of verification results.

```javascript
if (verifyPDF.isVerifyPDFSuccess(result)) {
  // result is VerifyPDFResponse
  console.log("Verification successful");
} else if (verifyPDF.isVerifyPDFError(result)) {
  // result is VerifyPDFError
  console.log("Error:", result.message);
}
```

### Summary Information

#### `getVerificationSummary(result)`

Extracts structured summary from verification result.

```javascript
const summary = verifyPDF.getVerificationSummary(result);
console.log(summary);
// Returns detailed status and signature information
```

## 🇪🇸 Spanish Certificate Support

This library provides enhanced support for Spanish digital certificates:

### Supported Certificate Types

- **FNMT-RCM**: Spanish government root certificates
- **DNIe**: Electronic national ID certificates
- **Corporate certificates**: Business and organizational certificates
- **Qualified certificates**: EU qualified electronic signatures

### Automatic Detection

The library automatically detects and handles Spanish certificate specificities:

- Certificate chain validation for Spanish CAs
- Proper handling of Spanish certificate extensions
- Support for Spanish legal framework compliance

## 🛡️ Security Considerations

### Certificate Validation

- Always use `caValidation: 'custom'` in production with trusted CA certificates
- Regularly update your custom CA certificate files
- Validate certificate expiration dates in your application logic

### Content Validation Security

- Content validation is performed on extracted text, not raw PDF structure
- Malicious PDFs could potentially bypass content validation
- Always combine content validation with signature verification
- Consider additional document structure validation for high-security scenarios

## 📋 Error Types

The library provides specific error types for different failure scenarios:

```javascript
// Import error constants
const { VerifyPDFError } = require("pdf-signature-reader-sl");

// Error types:
// VerifyPDFError.TYPE_INPUT      - Invalid input (not a PDF buffer)
// VerifyPDFError.TYPE_PARSE      - PDF parsing failed
// VerifyPDFError.TYPE_BYTE_RANGE - Byte range validation failed
// VerifyPDFError.VERIFY_SIGNATURE - Signature verification failed
// VerifyPDFError.UNSUPPORTED_SUBFILTER - Unsupported signature format
```

## 🔗 Dependencies

- **node-forge**: Cryptographic operations and certificate handling
- **pdf2json**: PDF text extraction for content validation
- **base64-js**: Base64 encoding/decoding utilities
- **ieee754**: IEEE 754 floating point operations

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all existing functionality remains intact
5. Submit a pull request

## 📞 Support

For issues and questions:

- Create an issue on GitHub
- Provide sample PDF files when possible (without sensitive data)
- Include error messages and stack traces
