declare interface SignOptions {
    algorithm?: string;
    keyid?: string;
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    subject?: string;
    issuer?: string;
    jwtid?: string;
    noTimestamp?: boolean;
    header?: object;
    encoding?: string;
}

declare interface VerifyOptions {
    algorithms?: string[];
    audience?: string | string[];
    clockTolerance?: number;
    issuer?: string | string[];
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    jwtId?: string;
    subject?: string;
    maxAge?: string;
}

declare module 'jwt-then' {
    export function sign(payload: string | Buffer | object, key: string | Buffer, opts?: SignOptions): Promise<string>;
    export function verify(token: string, key: string | Buffer, opts?: VerifyOptions): Promise<string | object>;
}