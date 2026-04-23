// src/models/loginLogoutModel.js
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import connection from '../db_config/connection.js';

class LoginLogout {
  constructor() {
    this.passwordResetTableReady = false;
  }

  /**
   * Normaliza username (remove espaços e converte para string)
   */
  normalizeUser(user) {
    return String(user ?? '').trim();
  }

  /**
   * Normaliza e-mail (trim + lowercase)
   */
  normalizeEmail(email) {
    return String(email ?? '')
      .trim()
      .toLowerCase();
  }

  hashResetToken(token) {
    return crypto.createHash('sha256').update(String(token ?? ''), 'utf8').digest('hex');
  }

  async ensurePasswordResetTable() {
    if (this.passwordResetTableReady) return;

    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await connection.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
      ON password_reset_tokens (user_id)
    `);

    await connection.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
      ON password_reset_tokens (expires_at)
    `);

    this.passwordResetTableReady = true;
  }

  /**
   * Verifica se a senha está no formato bcrypt
   */
  isBcryptHash(value) {
    return /^\$2[aby]\$\d{2}\$/.test(String(value ?? ''));
  }

  /**
   * Comparação segura de senhas em texto puro (legacy)
   */
  comparePlainText(a, b) {
    const left = Buffer.from(String(a ?? ''), 'utf8');
    const right = Buffer.from(String(b ?? ''), 'utf8');

    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
  }

  /**
   * Migra senha antiga (texto puro) para bcrypt
   */
  async migrateLegacyPassword(userId, senha) {
    const senhaHash = await bcrypt.hash(String(senha), 12);

    await connection.query('UPDATE users SET senha = $1 WHERE id = $2', [
      senhaHash,
      userId
    ]);

    const result = await connection.query(
      'SELECT LENGTH(senha) AS senha_len FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );

    const senhaLen = Number(result.rows?.[0]?.senha_len || 0);

    if (senhaLen < 60) {
      throw new Error(
        'Falha ao salvar o hash completo da senha no banco de dados.'
      );
    }
  }

  /**
   * LOGIN PRINCIPAL
   */
  async login(user, senha) {
    const normalizedUser = this.normalizeUser(user);
    if (!normalizedUser || !senha) {
      throw new Error('User and password must be provided');
    }

    try {
      const result = await connection.query(
        'SELECT id, username, senha FROM users WHERE username = $1 LIMIT 1',
        [normalizedUser]
      );

      const usuario = result.rows[0];

      if (!usuario) return null;

      const senhaSalva = String(usuario.senha ?? '');
      let senhaValida = false;

      if (this.isBcryptHash(senhaSalva) && senhaSalva.length >= 60) {
        senhaValida = await bcrypt.compare(String(senha), senhaSalva);
      } else if (this.isBcryptHash(senhaSalva)) {
        return null; // hash bcrypt inválido (tamanho errado)
      } else {
        // Senha legacy (texto puro)
        senhaValida = this.comparePlainText(senhaSalva, senha);
        if (senhaValida) {
          await this.migrateLegacyPassword(usuario.id, senha);
        }
      }

      if (!senhaValida) return null;

      return {
        id: usuario.id,
        username: usuario.username
      };
    } catch (error) {
      console.error('Erro ao executar a consulta SQL (login):', error);
      throw error;
    }
  }

  /**
   * Busca usuário por username OU e-mail
   */
  async findUserByUsernameOrEmail(user, email) {
    const normalizedUser = this.normalizeUser(user);
    const normalizedEmail = this.normalizeEmail(email);

    const result = await connection.query(
      'SELECT id, username, email FROM users WHERE username = $1 OR email = $2 LIMIT 1',
      [normalizedUser, normalizedEmail]
    );

    return result.rows[0] || null;
  }

  /**
   * Cria novo usuário (com hash bcrypt)
   */
  async createUser({ user, email, senha }) {
    const normalizedUser = this.normalizeUser(user);
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedPassword = String(senha ?? '');

    if (!normalizedUser || !normalizedEmail || !normalizedPassword) {
      throw new Error('User, email and password must be provided');
    }

    const existingUser = await this.findUserByUsernameOrEmail(
      normalizedUser,
      normalizedEmail
    );

    if (existingUser) {
      if (existingUser.username === normalizedUser) {
        return { error: 'Este nome de usuário já está em uso.' };
      }
      return { error: 'Este e-mail já está cadastrado.' };
    }

    const senhaHash = await bcrypt.hash(normalizedPassword, 12);

    const result = await connection.query(
      'INSERT INTO users (username, email, senha) VALUES ($1, $2, $3) RETURNING id',
      [normalizedUser, normalizedEmail, senhaHash]
    );

    return {
      id: result.rows[0].id,
      username: normalizedUser,
      email: normalizedEmail
    };
  }

  async findUserByEmail(email) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) return null;

    const result = await connection.query(
      'SELECT id, username, email FROM users WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    );

    return result.rows[0] || null;
  }

  async createPasswordResetToken(email) {
    await this.ensurePasswordResetTable();

    const user = await this.findUserByEmail(email);
    if (!user) return null;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(rawToken);

    await connection.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    );

    await connection.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [user.id, tokenHash]
    );

    return {
      user,
      token: rawToken
    };
  }

  async getPasswordResetTokenRecord(rawToken) {
    await this.ensurePasswordResetTable();

    const tokenHash = this.hashResetToken(rawToken);
    const result = await connection.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.username, u.email
       FROM password_reset_tokens prt
       INNER JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    return result.rows[0] || null;
  }

  async getValidPasswordResetToken(rawToken) {
    const record = await this.getPasswordResetTokenRecord(rawToken);
    if (!record) return null;

    const expiresAt = new Date(record.expires_at);
    if (record.used_at || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return record;
  }

  async resetPasswordWithToken(rawToken, senha) {
    await this.ensurePasswordResetTable();

    const client = await connection.connect();

    try {
      await client.query('BEGIN');

      const tokenHash = this.hashResetToken(rawToken);
      const tokenResult = await client.query(
        `SELECT id, user_id, expires_at, used_at
         FROM password_reset_tokens
         WHERE token_hash = $1
         FOR UPDATE`,
        [tokenHash]
      );

      const tokenRecord = tokenResult.rows[0];
      if (!tokenRecord) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Token inválido.' };
      }

      const expiresAt = new Date(tokenRecord.expires_at);
      if (tokenRecord.used_at || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Este link de redefinição expirou. Solicite um novo.' };
      }

      const senhaHash = await bcrypt.hash(String(senha), 12);

      await client.query('UPDATE users SET senha = $1 WHERE id = $2', [senhaHash, tokenRecord.user_id]);
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [tokenRecord.user_id]
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new LoginLogout();
