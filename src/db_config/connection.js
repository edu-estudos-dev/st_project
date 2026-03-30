import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

console.log('DATABASE_URL:', process.env.DATABASE_URL);

// 👇 parse manual (força funcionar)
const connection = mysql.createPool({
  uri: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

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