import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
import { Pool } from 'pg';//読み込む


//接続管理Poolを新しく作る、DATABASE_URLから接続するための情報を取得、
export const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "festival",
  user: "postgres",
  password: process.env.POSTGRES_PASSWORD
});


//import { pool } from './db.js';で他のファイルでも使えるようになった
pool.on('error', err => console.error('DB接続エラー:', err.message));

pool.query("SELECT 1")
  .then(() => {
    console.log("PostgreSQLに接続成功");
  })
  .catch((error) => {
    console.error("PostgreSQLに接続失敗", error);
  });