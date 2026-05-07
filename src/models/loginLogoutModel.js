// src/models/loginLogoutModel.js
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import connection from '../db_config/connection.js';
import AssinanteModel from './assinanteModel.js';
import { serializeProdutos } from '../utilities/produtoUtils.js';

const TRIAL_PRODUCTS = ['BOLINHAS', 'CONSIGNADOS', 'PELUCIAS'];

class LoginLogout {
  constructor() {
    this.passwordResetTableReady = false;
    this.emailVerificationTableReady = false;
    this.userEmailVerificationColumnReady = false;
  }

  buildTrialDates() {
    const trialInicio = new Date();
    const trialFim = new Date(trialInicio);
    trialFim.setDate(trialFim.getDate() + 30);

    return {
      trialInicio,
      trialFim
    };
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
    return crypto
      .createHash('sha256')
      .update(String(token ?? ''), 'utf8')
      .digest('hex');
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

  async ensureUserEmailVerificationColumn() {
    if (this.userEmailVerificationColumnReady) return;

    await connection.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ NULL
    `);

    await connection.query(`
      UPDATE users
      SET email_verified_at = NOW()
      WHERE email_verified_at IS NULL
        AND email_verification_sent_at IS NULL
        AND id IN (
          SELECT u.id
          FROM users u
          INNER JOIN assinantes a ON a.user_id = u.id
        )
    `);

    this.userEmailVerificationColumnReady = true;
  }

  async ensureEmailVerificationTable() {
    if (this.emailVerificationTableReady) return;

    await this.ensureUserEmailVerificationColumn();

    await connection.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await connection.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
      ON email_verification_tokens (user_id)
    `);

    await connection.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at
      ON email_verification_tokens (expires_at)
    `);

    this.emailVerificationTableReady = true;
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
    await this.ensureUserEmailVerificationColumn();

    const normalizedUser = this.normalizeUser(user);
    const normalizedEmail = this.normalizeEmail(user);

    if (!normalizedUser || !senha) {
      throw new Error('User and password must be provided');
    }

    try {
      const result = await connection.query(
        `SELECT
          u.id,
          u.username,
          u.senha,
          u.email,
          u.email_verified_at,
          a.id AS assinante_id,
          a.status_assinatura
        FROM users u
        LEFT JOIN assinantes a ON a.user_id = u.id
        WHERE LOWER(TRIM(u.username)) = LOWER($1)
           OR LOWER(TRIM(u.email)) = $2
        LIMIT 1`,
        [normalizedUser, normalizedEmail]
      );

      const usuario = result.rows[0];

      if (!usuario) return null;

      const senhaSalva = String(usuario.senha ?? '');
      let senhaValida = false;

      if (this.isBcryptHash(senhaSalva) && senhaSalva.length >= 60) {
        senhaValida = await bcrypt.compare(String(senha), senhaSalva);
      } else if (this.isBcryptHash(senhaSalva)) {
        return null;
      } else {
        senhaValida = this.comparePlainText(senhaSalva, senha);

        if (senhaValida) {
          await this.migrateLegacyPassword(usuario.id, senha);
        }
      }

      if (!senhaValida) return null;

      if (!usuario.email_verified_at) {
        return {
          error: 'email_not_verified',
          email: usuario.email,
          username: usuario.username
        };
      }

      const assinante = await this.ensureAssinanteForUser(usuario.id, {
        username: usuario.username
      });

      return {
        id: usuario.id,
        user_id: usuario.id,
        username: usuario.username,
        assinante_id: assinante.id,
        status_assinatura: assinante.status_assinatura
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
    await this.ensureUserEmailVerificationColumn();

    const normalizedUser = this.normalizeUser(user);
    const normalizedEmail = this.normalizeEmail(email);

    const result = await connection.query(
      `SELECT id, username, email, email_verified_at
       FROM users
       WHERE LOWER(TRIM(username)) = LOWER($1)
          OR LOWER(TRIM(email)) = $2
       LIMIT 1`,
      [normalizedUser, normalizedEmail]
    );

    return result.rows[0] || null;
  }

  /**
   * Cria novo usuário (com hash bcrypt)
   */
  async createUser({
    user,
    email,
    senha,
    produtos_habilitados,
    plano_codigo = null,
    plano_nome = null,
    valor_mensal = null
  }) {
    await this.ensureEmailVerificationTable();

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
      if (
        this.normalizeUser(existingUser.username).toLowerCase() ===
        normalizedUser.toLowerCase()
      ) {
        return { error: 'Este nome de usuário já está em uso.' };
      }

      return { error: 'Este e-mail já está cadastrado.' };
    }

    const senhaHash = await bcrypt.hash(normalizedPassword, 12);
    const client = await connection.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO users (username, email, senha, email_verification_sent_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id`,
        [normalizedUser, normalizedEmail, senhaHash]
      );

      const userId = result.rows[0].id;

      const assinante = await this.createAssinanteForUser(client, userId, {
        produtos_habilitados,
        plano_codigo,
        plano_nome,
        valor_mensal
      });

      await client.query('COMMIT');

      return {
        id: userId,
        user_id: userId,
        username: normalizedUser,
        email: normalizedEmail,
        assinante_id: assinante.id,
        status_assinatura: assinante.status_assinatura
      };
    } catch (error) {
      await client.query('ROLLBACK');

      if (error?.code === '23505') {
        const detail = String(
          error.detail || error.constraint || ''
        ).toLowerCase();

        if (detail.includes('username')) {
          return { error: 'Este nome de usuário já está em uso.' };
        }

        if (detail.includes('email')) {
          return { error: 'Este e-mail já está cadastrado.' };
        }
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async findAssinanteByUserId(userId) {
    return AssinanteModel.findByUserId(userId);
  }

  async createAssinanteForUser(client, userId, overrides = {}) {
    const { trialInicio, trialFim } = this.buildTrialDates();
    const statusAssinatura = overrides.status_assinatura || 'trial';
    const tipoCobranca = overrides.tipo_cobranca ?? null;
    const dataAtivacao = overrides.data_ativacao ?? null;
    const dataVencimento = overrides.data_vencimento ?? null;
    const dataLimiteExclusao = overrides.data_limite_exclusao ?? null;
    const produtosHabilitados = serializeProdutos(
      overrides.produtos_habilitados || TRIAL_PRODUCTS
    );
    const planoCodigo = overrides.plano_codigo ?? null;
    const planoNome = overrides.plano_nome ?? null;
    const valorMensal = overrides.valor_mensal ?? null;

    await client.query(`
      ALTER TABLE assinantes
      ADD COLUMN IF NOT EXISTS produtos_habilitados TEXT,
      ADD COLUMN IF NOT EXISTS plano_codigo VARCHAR(50),
      ADD COLUMN IF NOT EXISTS plano_nome VARCHAR(100),
      ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10, 2)
    `);

    const result = await client.query(
      `INSERT INTO assinantes (
        user_id,
        status_assinatura,
        tipo_cobranca,
        produtos_habilitados,
        plano_codigo,
        plano_nome,
        valor_mensal,
        trial_inicio,
        trial_fim,
        data_ativacao,
        data_vencimento,
        data_limite_exclusao,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING id, user_id, status_assinatura, tipo_cobranca, trial_inicio, trial_fim,
                data_ativacao, data_vencimento, data_limite_exclusao,
                produtos_habilitados, plano_codigo, plano_nome, valor_mensal`,
      [
        userId,
        statusAssinatura,
        tipoCobranca,
        produtosHabilitados,
        planoCodigo,
        planoNome,
        valorMensal,
        trialInicio,
        trialFim,
        dataAtivacao,
        dataVencimento,
        dataLimiteExclusao
      ]
    );

    return result.rows[0];
  }

  async ensureAssinanteForUser(userId, userInfo = {}) {
    const existingAssinante = await this.findAssinanteByUserId(userId);

    if (existingAssinante) {
      return existingAssinante;
    }

    const client = await connection.connect();

    try {
      await client.query('BEGIN');

      const createdAssinante = await this.createAssinanteForUser(
        client,
        userId
      );

      await client.query('COMMIT');

      if (userInfo.username) {
        console.warn(
          `Assinante criado automaticamente para o usuário ${userInfo.username} (id ${userId}).`
        );
      }

      return createdAssinante;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findUserByEmail(email) {
    await this.ensureUserEmailVerificationColumn();

    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedEmail) return null;

    const result = await connection.query(
      'SELECT id, username, email, email_verified_at FROM users WHERE email = $1 LIMIT 1',
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

  hashEmailVerificationToken(token) {
    return this.hashResetToken(token);
  }

  async createEmailVerificationToken(userId) {
    await this.ensureEmailVerificationTable();

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashEmailVerificationToken(rawToken);

    await connection.query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [userId]
    );

    await connection.query(
      'UPDATE users SET email_verification_sent_at = NOW() WHERE id = $1 AND email_verified_at IS NULL',
      [userId]
    );

    await connection.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [userId, tokenHash]
    );

    return rawToken;
  }

  async createEmailVerificationTokenByEmail(email) {
    const user = await this.findUserByEmail(email);

    if (!user || user.email_verified_at) return null;

    const token = await this.createEmailVerificationToken(user.id);

    return {
      user,
      token
    };
  }

  async verifyEmailWithToken(rawToken) {
    await this.ensureEmailVerificationTable();

    const client = await connection.connect();

    try {
      await client.query('BEGIN');

      const tokenHash = this.hashEmailVerificationToken(rawToken);

      const tokenResult = await client.query(
        `SELECT evt.id, evt.user_id, evt.expires_at, evt.used_at
         FROM email_verification_tokens evt
         WHERE evt.token_hash = $1
         FOR UPDATE`,
        [tokenHash]
      );

      const tokenRecord = tokenResult.rows[0];

      if (!tokenRecord) {
        await client.query('ROLLBACK');

        return {
          success: false,
          error: 'Token invalido.'
        };
      }

      const expiresAt = new Date(tokenRecord.expires_at);

      if (
        tokenRecord.used_at ||
        Number.isNaN(expiresAt.getTime()) ||
        expiresAt.getTime() <= Date.now()
      ) {
        await client.query('ROLLBACK');

        return {
          success: false,
          error: 'Este link de verificacao expirou. Solicite um novo.'
        };
      }

      await client.query(
        'UPDATE users SET email_verified_at = NOW() WHERE id = $1',
        [tokenRecord.user_id]
      );

      await client.query(
        'UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [tokenRecord.user_id]
      );

      await client.query('COMMIT');

      return {
        success: true
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

    if (
      record.used_at ||
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
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

        return {
          success: false,
          error: 'Token inválido.'
        };
      }

      const expiresAt = new Date(tokenRecord.expires_at);

      if (
        tokenRecord.used_at ||
        Number.isNaN(expiresAt.getTime()) ||
        expiresAt.getTime() <= Date.now()
      ) {
        await client.query('ROLLBACK');

        return {
          success: false,
          error: 'Este link de redefinição expirou. Solicite um novo.'
        };
      }

      const senhaHash = await bcrypt.hash(String(senha), 12);

      await client.query('UPDATE users SET senha = $1 WHERE id = $2', [
        senhaHash,
        tokenRecord.user_id
      ]);

      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [tokenRecord.user_id]
      );

      await client.query('COMMIT');

      return {
        success: true
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new LoginLogout();