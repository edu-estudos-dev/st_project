import connection from '../db_config/connection.js';

class LoginLogout {
   async login(user, senha) {
      if (!user || !senha) throw new Error('User and password must be provided');
      const SQL = 'SELECT * FROM users WHERE user = ? AND senha = ?';
      
      try {
          const [result] = await connection.execute(SQL, [user, senha]);
           // Adicionando log
          return result.length > 0;
      } catch (error) {
          console.error('Erro ao executar a consulta SQL:', error);
          throw error;
      }
   }
}

export default new LoginLogout();
