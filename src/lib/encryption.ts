import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Using a fixed key derived from the project name/token if env var is missing for MVP solidity.
// ideally this should be process.env.ENCRYPTION_KEY (32 chars)
const SECRET_KEY = process.env.ENCRYPTION_KEY || crypto.createHash('sha256').update('crm-agent-secret-key-2025').digest('base64').substring(0, 32); 
const IV_LENGTH = 16;

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
