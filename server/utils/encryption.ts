import CryptoJS from 'crypto-js';
import { config } from '../config';

/**
 * Encrypt sensitive data (OAuth tokens)
 */
export function encrypt(text: string): string {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, config.encryption.key).toString();
}

/**
 * Decrypt sensitive data (OAuth tokens)
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return '';
  const bytes = CryptoJS.AES.decrypt(ciphertext, config.encryption.key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

