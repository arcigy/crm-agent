
import crypto from 'crypto';

// Algoritmus šifrovania
const ALGORITHM = 'aes-256-cbc';

// Kľúč musí byť 32 bytov (256 bitov). Získame ho z ENV alebo použijeme fallback pre dev.
// V produkcii MUSÍTE nastaviť ENCRYPTION_KEY v Railway premenných!
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'v5y8z2a4c6e7g9i0k1m3o5q7s9u1w3y3'; // 32 znakov pre dev
const IV_LENGTH = 16; // Pre AES, dĺžka inicializačného vektora

/**
 * Zašifruje text (API Key) pre uloženie do databázy.
 * Výstup: "iv:encryptedText" (hex formát)
 */
export function encrypt(text: string): string {
    if (!text) return '';
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Dešifruje text z databázy späť na API Key.
 * Použije sa iba na serveri tesne pred volaním Google API.
 */
export function decrypt(text: string): string {
    if (!text) return '';
    
    const textParts = text.split(':');
    if (textParts.length !== 2) return text; // Ak nie je v správnom formáte, vráť pôvodné (migrácia)

    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
}

/**
 * Maskuje kľúč pre zobrazenie na Frontende (napr. "AIzaSyD...X8s")
 */
export function maskKey(key: string): string {
    if (key.length < 10) return '********';
    return key.substring(0, 7) + '...' + key.substring(key.length - 3);
}
