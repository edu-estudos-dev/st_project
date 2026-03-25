import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import connection from '../db_config/connection.js';

class UserModel {
    async verifyUser(username, password) {
        const sql = 'SELECT * FROM users WHERE user = ? LIMIT 1';
        const [result] = await connection.execute(sql, [username]);
        const usuario = result[0];

        if (!usuario) {
            return undefined;
        }

        const senhaSalva = String(usuario.senha ?? '');
        const senhaInformada = String(password ?? '');
        let senhaValida = false;

        if (/^\$2[aby]\$\d{2}\$/.test(senhaSalva)) {
            senhaValida = await bcrypt.compare(senhaInformada, senhaSalva);
        } else {
            const senhaSalvaBuffer = Buffer.from(senhaSalva, 'utf8');
            const senhaInformadaBuffer = Buffer.from(senhaInformada, 'utf8');
            senhaValida = senhaSalvaBuffer.length === senhaInformadaBuffer.length
                && crypto.timingSafeEqual(senhaSalvaBuffer, senhaInformadaBuffer);
        }

        return senhaValida ? usuario : undefined;
    }
}

export default new UserModel();
