const BASE64URL = {
    alphabet: 'base64url',
    omitPadding: true
};
const SALT_LENGTH = 3;

export const saltedBase64ToBytes = (s) => Uint8Array.fromBase64(s, BASE64URL).slice(SALT_LENGTH);
export const saltedBase64ToString = (s) => new TextDecoder().decode(saltedBase64ToBytes(s));
export const bytesToSaltedBase64 = (b) => {
    const salt = new Uint8Array(SALT_LENGTH);
    crypto.getRandomValues(salt);
    const combined = new Uint8Array(salt.length + b.length);
    combined.set(salt);
    combined.set(b, salt.length);
    return combined.toBase64(BASE64URL);
}
export const stringToSaltedBase64 = (s) => bytesToSaltedBase64(new TextEncoder().encode(s));
