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
  - `customRootCAPath` (`string`, optional): Path to custom root CA certificates file

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
