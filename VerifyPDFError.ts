export const TYPE_PARSE = 'TYPE_PARSE';
export const TYPE_BYTE_RANGE = 'TYPE_BYTE_RANGE';
export const TYPE_INPUT = 'TYPE_INPUT';
export const UNSUPPORTED_SUBFILTER = 'UNSUPPORTED_SUBFILTER';
export class VerifyPDFError extends Error {
  type: string;

  static TYPE_UNKNOWN = 'TYPE_UNKNOWN';
  static TYPE_INPUT = 'TYPE_INPUT';
  static TYPE_PARSE = 'TYPE_PARSE';
  static TYPE_BYTE_RANGE = 'TYPE_BYTE_RANGE';
  static VERIFY_SIGNATURE = 'VERIFY_SIGNATURE';
  static UNSUPPORTED_SUBFILTER = 'UNSUPPORTED_SUBFILTER';

  constructor(msg: string, type: string = VerifyPDFError.TYPE_UNKNOWN) {
    super(msg);
    this.type = type;
    Object.setPrototypeOf(this, VerifyPDFError.prototype);
  }
}