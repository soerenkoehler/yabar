const BASE64URL = {
    alphabet: 'base64url',
    omitPadding: true
};
const SALT_LENGTH = 3;

export const saltedBase64ToBytes = (value) => Uint8Array.fromBase64(value, BASE64URL).slice(SALT_LENGTH);
export const saltedBase64ToString = (value) => new TextDecoder().decode(saltedBase64ToBytes(value));
export const bytesToSaltedBase64 = (value) => {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    const salt = new Uint8Array(SALT_LENGTH);
    crypto.getRandomValues(salt);
    const combined = new Uint8Array(salt.length + bytes.length);
    combined.set(salt);
    combined.set(bytes, salt.length);
    return combined.toBase64(BASE64URL);
};
export const stringToSaltedBase64 = (value) => bytesToSaltedBase64(new TextEncoder().encode(value));