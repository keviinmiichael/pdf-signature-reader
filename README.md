## Verifying PDF signature

The signed file has the public certificate embedded in it, so all we need to verify a PDF file is the file itself. This package is a clone from [ninja-labs-tech/verify-pdf](https://github.com/ninja-labs-tech/verify-pdf) with update on dependencies, cause we got issue when installing the package with node >= 16 & npm >= 8

## Installation

```
npm i pdf-signature-reader-sl
```

## Importing

```javascript
// CommonJS require
const verifyPDF = require("pdf-signature-reader-sl");

// ES6 imports
import verifyPDF from "pdf-signature-reader-sl";
```

## Verifying

Verify the digital signature of the pdf and extract the certificates details

### Node.js

```javascript
const verifyPDF = require("pdf-signature-reader-sl");
const signedPdfBuffer = fs.readFileSync("yourPdf");

const { verified, authenticity, integrity, expired, signatures } =
  verifyPDF(signedPdfBuffer);
```

### Browser

```javascript
import verifyPDF from "pdf-signature-reader";

const readFile = (e) => {
  const file = e.target.files[0];
  let reader = new FileReader();
  reader.onload = function (e) {
    const { verified } = verifyPDF(reader.result);
  };
  reader.readAsArrayBuffer(file);
};
```

- signedPdfBuffer: signed PDF as buffer.
- verified: The overall status of verification process.
- authenticity: Indicates if the validity of the certificate chain and the root CA (overall in case of multiple signatures).
- integrity: Indicates if the pdf has been tampered with or not (overall in case of multiple signatures).
- expired: Indicates if any of the certificates has expired.
- signatures: Array that contains the certificate details and signatureMeta (Reason, ContactInfo, Location and Name) for each signature.

## Certificates

You can get the details of the certificate chain by using the following api.

```javascript
const { getCertificatesInfoFromPDF } = require("pdf-signature-reader"); // require

import { getCertificatesInfoFromPDF } from "pdf-signature-reader"; // ES6
```

```javascript
const certs = getCertificatesInfoFromPDF(signedPdfBuffer);
```

- signedPdfBuffer: signed PDF as buffer.

- certs:

  - issuedBy: The issuer of the certificate.
  - issuedTo: The owner of the certificate.
  - validityPeriod: The start and end date of the certificate.
  - pemCertificate: Certificate in pem format.
  - clientCertificate: true for the client certificate.

## Custom Root CA

Since the current version, you can specify custom root certificates for verification using the `customRootCAPath` parameter.

### Basic Usage

```javascript
const verifyPDF = require("pdf-signature-reader-sl");
const signedPdfBuffer = fs.readFileSync("yourPdf");

// Using custom certificates
const customRootCAPath = "./path/to/your/certificates.pem";
const { verified, authenticity, integrity, expired, signatures } = verifyPDF(
  signedPdfBuffer,
  { customRootCAPath }
);
```

### Behavior

- **With `customRootCAPath`**: Uses only the certificates from the specified file
- **Without `customRootCAPath`**: Default behavior (system + local certificates)

### Complete Example

```javascript
const fs = require("fs");
const verifyPDF = require("pdf-signature-reader-sl");

// Load PDF
const pdfBuffer = fs.readFileSync("signed-document.pdf");

// Option 1: Custom certificates
const customResult = verifyPDF(pdfBuffer, {
  customRootCAPath: "./certs/custom-ca.pem",
});

// Option 2: Default certificates (backward compatible)
const defaultResult = verifyPDF(pdfBuffer);

console.log("Custom CA:", customResult.verified);
console.log("Default CA:", defaultResult.verified);
```

### Certificate File Format

The file must contain certificates in PEM format:

```
-----BEGIN CERTIFICATE-----
MIIFgzCCA2ugAwIBAgIPXZONMGc2yAYdGsdUhGkHMA0GCSqGSIb3DQEBCwUAMDsx
...
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIGQTCCBCmgAwIBAgIQXem6yKx4WyydZcEXlzuxYjANBgkqhkiG9w0BAQsFADA7
...
-----END CERTIFICATE-----
```
