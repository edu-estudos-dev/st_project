import connection from '../db_config/connection.js';
class UserModel {
    async verifyUser(username, password) {
        const sql = 'SELECT * FROM users WHERE user = ? AND senha = ?'; // Utilize as colunas corretas
        const [result] = await connection.execute(sql, [username, password]);
        return result[0]; // Retorna o usuário encontrado ou undefined se não encontrar
    }
}

export default new UserModel();
