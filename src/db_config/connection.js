import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = mysql.createPool(process.env.DATABASE_URL);

const testConnection = async () => {
  try {
    const conn = await connection.getConnection();
    console.log('Connected to database 🚀');
    conn.release();
  } catch (error) {
    console.error('Error connecting ❌');
    console.error(error);
  }
};

testConnection();

export default connection;