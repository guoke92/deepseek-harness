/**
 * 凭据加密：AES-256-GCM，本机密钥文件（权限 600）。密钥不放在存储 domain 内。
 * 密文格式：v1:<iv base64url>:<tag base64url>:<ciphertext base64url>
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { dirname } from 'node:path'

const PREFIX = 'v1'
const KEY_BYTES = 32

/** @param {Buffer} key 32 字节密钥 */
export function createSecretBox(key) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) throw new Error('secret key must be 32 bytes')
  return {
    seal(plaintext) {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const data = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
      const tag = cipher.getAuthTag()
      return [PREFIX, iv.toString('base64url'), tag.toString('base64url'), data.toString('base64url')].join(':')
    },
    open(sealed) {
      const parts = String(sealed).split(':')
      if (parts.length !== 4 || parts[0] !== PREFIX) throw new Error('unrecognized sealed value')
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(parts[1], 'base64url'))
      decipher.setAuthTag(Buffer.from(parts[2], 'base64url'))
      return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8')
    },
  }
}

/** 读取或生成密钥文件：不存在则生成 32 字节随机密钥并以 0600 写入；权限不是 0600 则拒绝使用。 */
export async function loadOrCreateKey(path, fsImpl) {
  const fs = fsImpl
  try {
    const st = await fs.stat(path)
    if ((st.mode & 0o777) !== 0o600) throw new Error(`secret key file ${path} must have mode 600`)
    const buf = await fs.readFile(path)
    if (buf.length !== KEY_BYTES) throw new Error(`secret key file ${path} must hold 32 bytes`)
    return buf
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err
    const key = randomBytes(KEY_BYTES)
    await fs.mkdir(dirname(path), { recursive: true, mode: 0o700 })
    await fs.writeFile(path, key, { mode: 0o600, flag: 'wx' })
    return key
  }
}
