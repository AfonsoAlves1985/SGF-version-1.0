declare module "jsonwebtoken" {
  export function sign(payload: string | object | Buffer, secret: string, options?: SignOptions): string;
  export function verify(token: string, secret: string, options?: VerifyOptions): string | object;
  export function decode(token: string): string | object | null;
  
  interface SignOptions {
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    issuer?: string;
    subject?: string;
    jwtid?: string;
  }
  
  interface VerifyOptions {
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    issuer?: string;
    subject?: string;
    algorithms?: string[];
  }
}