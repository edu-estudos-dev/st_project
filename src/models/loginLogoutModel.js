import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import connection from '../db_config/connection.js';

class LoginLogout {
   normalizeUser(user) {
      return String(user ?? '').trim();
   }

   normalizeEmail(email) {
      return String(email ?? '').trim().toLowerCase();
   }

   isBcryptHash(value) {
      return /^\$2[aby]\$\d{2}\$/.test(String(value ?? ''));
   }

   comparePlainText(a, b) {
      const left = Buffer.from(String(a ?? ''), 'utf8');
      const right = Buffer.from(String(b ?? ''), 'utf8');

      if (left.length !== right.length) {
         return false;
      }

      return crypto.timingSafeEqual(left, right);
   }

   async migrateLegacyPassword(userId, senha) {
      const senhaHash = await bcrypt.hash(String(senha), 12);
      await connection.execute('UPDATE users SET senha = ? WHERE id = ?', [senhaHash, userId]);

      const [rows] = await connection.execute('SELECT LENGTH(senha) AS senha_len FROM users WHERE id = ? LIMIT 1', [userId]);
      const senhaLen = Number(rows?.[0]?.senha_len || 0);

      if (senhaLen < 60) {
         throw new Error('Falha ao salvar o hash completo da senha no banco de dados.');
      }
   }

   async login(user, senha) {
      const normalizedUser = this.normalizeUser(user);
      if (!normalizedUser || !senha) throw new Error('User and password must be provided');

      try {
         const [result] = await connection.execute(
            'SELECT id, user, senha FROM users WHERE user = ? LIMIT 1',
            [normalizedUser]
         );

         const usuario = result[0];
         if (!usuario) {
            return null;
         }

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

         if (!senhaValida) {
            return null;
         }

         return {
            id: usuario.id,
            username: usuario.user
         };
      } catch (error) {
         console.error('Erro ao executar a consulta SQL:', error);
         throw error;
      }
   }

   async findUserByUsernameOrEmail(user, email) {
      const normalizedUser = this.normalizeUser(user);
      const normalizedEmail = this.normalizeEmail(email);
      const [rows] = await connection.execute(
         'SELECT id, user, email FROM users WHERE user = ? OR email = ? LIMIT 1',
         [normalizedUser, normalizedEmail]
      );

      return rows[0] || null;
   }

   async createUser({ user, email, senha }) {
      const normalizedUser = this.normalizeUser(user);
      const normalizedEmail = this.normalizeEmail(email);
      const normalizedPassword = String(senha ?? '');

      if (!normalizedUser || !normalizedEmail || !normalizedPassword) {
         throw new Error('User, email and password must be provided');
      }

      const existingUser = await this.findUserByUsernameOrEmail(normalizedUser, normalizedEmail);
      if (existingUser) {
         if (existingUser.user === normalizedUser) {
            return { error: 'Este nome de usuario ja esta em uso.' };
         }

         return { error: 'Este e-mail ja esta cadastrado.' };
      }

      const senhaHash = await bcrypt.hash(normalizedPassword, 12);
      const [result] = await connection.execute(
         'INSERT INTO users (user, email, senha) VALUES (?, ?, ?)',
         [normalizedUser, normalizedEmail, senhaHash]
      );

      return {
         id: result.insertId,
         username: normalizedUser,
         email: normalizedEmail
      };
   }
}

export default new LoginLogout();
