declare module 'text-encoding' {
  export class TextEncoder {
    constructor(label?: string);
    encode(input?: string): Uint8Array;
  }

  export class TextDecoder {
    constructor(label?: string);
    decode(input?: Uint8Array): string;
  }
}
