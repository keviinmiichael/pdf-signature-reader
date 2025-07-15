# PDF Signature Reader

A comprehensive library for verifying digital signatures in PDF documents with enhanced support for Spanish certificates (FNMT, DNIe, corporate certificates).

## Installation

```bash
npm install pdf-signature-reader-sl
```

## API Reference

### Main Export: `verifyPDF`

**Type**: `Function`  
**Description**: Main function to verify PDF digital signatures  
**Parameters**:

- `pdf` (`Buffer | string`): PDF file as buffer or string
- `options` (`Object`, optional): Configuration options
  - `caPath` (`string`, optional): Path to custom root CA certificates file
  - `caValidation` (`'custom' | 'all'`, optional): Certificate validation mode (default: 'all')

**Returns**: `VerifyPDFResponse | VerifyPDFError`

#### Success Response (`VerifyPDFResponse`)

```typescript
{
  verified: boolean,        // Overall verification status
  authenticity: boolean,    // Certificate chain validity
  integrity: boolean,       // Document integrity check
  expired: boolean,         // Any certificate expired
  signatures: SignatureInfo[]  // Array of signature details
}
```

#### Error Response (`VerifyPDFError`)

```typescript
{
  verified: false,
  message: string,          // Error description
  error: Error             // Original error object
}
```

#### Configuration Options

##### `caValidation` modes:

- **`'all'` (default)**: Uses system root certificates and optionally custom certificates if `caPath` is provided
- **`'custom'`**: Uses only custom certificates provided via `caPath` (ignores system certificates)

##### Examples:

```javascript
// Using default system certificates
const result = verifyPDF(pdfBuffer);

// Adding custom certificates to system ones
const result = verifyPDF(pdfBuffer, {
  caPath: "./certs/custom-ca.pem",
  caValidation: "all", // default behavior
});

// Using only custom certificates
const result = verifyPDF(pdfBuffer, {
  caPath: "./certs/custom-ca.pem",
  caValidation: "custom",
});
```

### Exported Functions

#### `getCertificatesInfoFromPDF`

**Type**: `Function`  
**Description**: Extracts certificate details from PDF without verification  
**Parameters**:

- `pdf` (`Buffer | string`): PDF file as buffer or string

**Returns**: `Array<Array<CertificateDetails>>`

Each certificate contains:

```typescript
{
  clientCertificate?: boolean,     // True for signing certificate
  issuedBy: CertificateEntity,     // Certificate issuer info
  issuedTo: CertificateEntity,     // Certificate subject info
  validityPeriod: ValidityPeriod,  // Validity dates
  pemCertificate: string          // Certificate in PEM format
}
```

### Utility Functions

#### `isVerifyPDFSuccess`

**Type**: `Function`  
**Description**: Type guard to check if result is successful  
**Parameters**:

- `result` (`VerifyPDFResult`): Result from verifyPDF

**Returns**: `boolean`

#### `isVerifyPDFError`

**Type**: `Function`  
**Description**: Type guard to check if result is an error  
**Parameters**:

- `result` (`VerifyPDFResult`): Result from verifyPDF

**Returns**: `boolean`

#### `getVerificationSummary`

**Type**: `Function`  
**Description**: Extracts summary information from verification result  
**Parameters**:

- `result` (`VerifyPDFResult`): Result from verifyPDF

**Returns**: `Object`

```typescript
{
  status: 'success' | 'error' | 'unknown',
  verified: boolean,
  signaturesCount: number,
  signatures?: Array<{
    index: number,
    verified: boolean,
    signer: string,
    certificatesCount: number
  }>
}
```

#### `extractCertificatesInfo`

**Type**: `Function`  
**Description**: Extracts structured certificate information  
**Parameters**:

- `result` (`VerifyPDFResult`): Result from verifyPDF

**Returns**: `Array<Object>`

```typescript
{
  signatureIndex: number,
  certificateIndex: number,
  isClientCertificate: boolean,
  commonName?: string,
  organization?: string,
  country?: string,
  serialNumber?: string
}
```

#### `isValidVerifyPDFResponse`

**Type**: `Function`  
**Description**: Validates if object has correct VerifyPDFResponse structure  
**Parameters**:

- `obj` (`any`): Object to validate

**Returns**: `boolean`

### Constants

#### `Constants.VERIFICATION_STATUS`

**Type**: `Object`  
**Description**: Verification status constants

```typescript
{
  SUCCESS: 'success',
  ERROR: 'error',
  UNKNOWN: 'unknown'
}
```

#### `Constants.CERTIFICATE_TYPES`

**Type**: `Object`  
**Description**: Common Spanish certificate types

```typescript
{
  FNMT: 'FNMT-RCM',
  DNIE: 'DNIE',
  EMPRESA: 'empresa'
}
```

#### `Constants.CERTIFICATE_FIELDS`

**Type**: `Object`  
**Description**: Standard certificate field names

```typescript
{
  COMMON_NAME: 'commonName',
  ORGANIZATION: 'organizationName',
  COUNTRY: 'countryName',
  SERIAL_NUMBER: 'serialNumber',
  GIVEN_NAME: 'givenName',
  SURNAME: 'surname'
}
```

### Utility Aliases (`utils`)

**Type**: `Object`  
**Description**: Alternative names for utility functions

- `utils.isSuccess`: Alias for `isVerifyPDFSuccess`
- `utils.isError`: Alias for `isVerifyPDFError`
- `utils.getSummary`: Alias for `getVerificationSummary`
- `utils.getCertificates`: Alias for `extractCertificatesInfo`
- `utils.validate`: Alias for `isValidVerifyPDFResponse`

### Error Classes

#### `VerifyPDFError`

**Type**: `Class extends Error`  
**Description**: Custom error class for PDF verification errors  
**Properties**:

- `message` (`string`): Error message
- `type` (`string`): Error type constant

**Error Types**:

- `TYPE_UNKNOWN`: Unknown error
- `TYPE_INPUT`: Input validation error
- `TYPE_PARSE`: PDF parsing error
- `TYPE_BYTE_RANGE`: Byte range validation error
- `VERIFY_SIGNATURE`: Signature verification error
- `UNSUPPORTED_SUBFILTER`: Unsupported signature subfilter

### TypeScript Support

The library includes complete TypeScript definitions in `types.d.ts` with interfaces for:

- `VerifyPDFResponse`
- `VerifyPDFError`
- `SignatureInfo`
- `CertificateDetails`
- `CertificateEntity`
- `ValidityPeriod`
- `SignatureMeta`
- `VerifyPDFOptions`
- `CertificateValidationMode`

## Practical Examples

### Basic PDF Verification

```javascript
const verifyPDF = require("pdf-signature-reader-sl");
const fs = require("fs");

// Read PDF file
const pdfBuffer = fs.readFileSync("signed-document.pdf");

// Basic verification with system certificates
const result = verifyPDF(pdfBuffer);

if (result.verified) {
  console.log("✅ PDF signature is valid");
  console.log(`📋 Found ${result.signatures.length} signatures`);
} else {
  console.log("❌ PDF signature verification failed");
  console.log(`💬 Error: ${result.message || "Unknown error"}`);
}
```

### Custom Certificate Authority

```javascript
// Use custom CA certificates along with system ones
const result = verifyPDF(pdfBuffer, {
  caPath: "./certificates/custom-ca.pem",
  caValidation: "all", // Use both system and custom certificates
});

// Use ONLY custom CA certificates (ignore system certificates)
const strictResult = verifyPDF(pdfBuffer, {
  caPath: "./certificates/custom-ca.pem",
  caValidation: "custom", // Use only custom certificates
});
```

### Extract Certificate Information

```javascript
// Get detailed certificate information
const certInfo = verifyPDF.getCertificatesInfoFromPDF(pdfBuffer);

certInfo.forEach((signatureCerts, sigIndex) => {
  console.log(`Signature ${sigIndex + 1}:`);

  signatureCerts.forEach((cert, certIndex) => {
    if (cert.clientCertificate) {
      console.log(`  👤 Signer: ${cert.issuedTo.commonName}`);
      console.log(`  🏢 Organization: ${cert.issuedTo.organizationName}`);
      console.log(`  🌍 Country: ${cert.issuedTo.countryName}`);
      console.log(`  📅 Valid until: ${cert.validityPeriod.notAfter}`);
    }
  });
});
```

### Error Handling

```javascript
const result = verifyPDF(pdfBuffer, {
  caPath: "./certs/custom.pem",
  caValidation: "custom",
});

// Type checking helpers
if (verifyPDF.isVerifyPDFError(result)) {
  console.error("Verification failed:", result.message);
  console.error("Original error:", result.error);
} else if (verifyPDF.isVerifyPDFSuccess(result)) {
  console.log("Verification successful!");

  // Check individual signature details
  result.signatures.forEach((sig, index) => {
    if (!sig.authenticity) {
      console.warn(`⚠️ Signature ${index + 1}: Certificate chain not trusted`);
    }
    if (!sig.integrity) {
      console.error(`❌ Signature ${index + 1}: Document has been modified`);
    }
    if (sig.expired) {
      console.warn(`⏰ Signature ${index + 1}: Certificate has expired`);
    }
  });
}
```

## Features

### Digital Signature Verification
- Complete verification of PDF digital signatures
- Support for multiple signature formats and standards
- Certificate chain validation with custom CA support
- Document integrity checking
- Expiration date validation

### Enhanced Spanish Certificate Support
- **FNMT-RCM**: Spanish government certificates
- **DNIe**: Electronic national ID certificates  
- **Corporate certificates**: Business and organizational certificates
- Automatic certificate type detection and classification

### Flexible Certificate Validation
- **System certificates**: Uses operating system's trusted root certificates
- **Custom certificates**: Support for custom CA certificate files
- **Hybrid mode**: Combines system and custom certificates for maximum compatibility
- **Strict mode**: Uses only custom certificates for controlled environments

### Comprehensive Error Handling
- Detailed error reporting with specific error types
- Type-safe error handling with TypeScript support
- Graceful handling of malformed or unsupported PDF files
- Clear distinction between verification failures and system errors
