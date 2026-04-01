// src/models/loginLogoutModel.js
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connection from '../db_config/connection.js';

class LoginLogout {
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
        return { error: 'Este nome de usuario ja esta em uso.' };
      }
      return { error: 'Este e-mail ja esta cadastrado.' };
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
}

export default new LoginLogout();
