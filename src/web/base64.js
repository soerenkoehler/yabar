const BASE64URL = {
    alphabet: 'base64url',
    omitPadding: true
};

export const fromBase64 = (s) => new TextDecoder().decode(Uint8Array.fromBase64(s, BASE64URL));
export const fromSaltedBase64 = (s) => new TextDecoder().decode(Uint8Array.fromBase64(s, BASE64URL).slice(4));

export const toBase64 = (s) => new TextEncoder().encode(s).toBase64(BASE64URL);
export const toSaltedBase64 = (s) => {
    const salt = new Uint8Array(4);
    crypto.getRandomValues(salt);
    const encoded = new TextEncoder().encode(s);
    const combined = new Uint8Array(salt.length + encoded.length);
    combined.set(salt);
    combined.set(encoded, salt.length);
    return combined.toBase64(BASE64URL);
};
