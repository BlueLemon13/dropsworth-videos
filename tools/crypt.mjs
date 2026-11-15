// AES-256-GCM file locking. Key = DW_ARCHIVE_KEY (64 hex chars) from .env / GitHub secret.
// Format: 12-byte IV | 16-byte auth tag | ciphertext.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {need} from './env.mjs';

const key = () => Buffer.from(need('DW_ARCHIVE_KEY'), 'hex');

export function lock(src, dest) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([c.update(fs.readFileSync(src)), c.final()]);
  fs.writeFileSync(dest, Buffer.concat([iv, c.getAuthTag(), body]));
}

export function unlock(src, dest) {
  const buf = fs.readFileSync(src);
  const d = crypto.createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  fs.writeFileSync(dest, Buffer.concat([d.update(buf.subarray(28)), d.final()]));
}

// CLI: node tools/crypt.mjs lock|unlock <src> <dest>
if (process.argv[1]?.endsWith('crypt.mjs')) {
  const [cmd, src, dest] = process.argv.slice(2);
  (cmd === 'lock' ? lock : unlock)(src, dest);
  console.log(`${cmd}ed ${src} -> ${dest}`);
}
