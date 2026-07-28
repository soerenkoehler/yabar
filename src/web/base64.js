const BASE64URL = { alphabet: 'base64url' };

export const toBase64 = (s) => new TextEncoder().encode(s).toBase64(BASE64URL);
export const fromBase64 = (s) => new TextDecoder().decode(Uint8Array.fromBase64(s, BASE64URL));
