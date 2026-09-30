//必要なもの
import type{ Request, Response, NextFunction } from 'express';
import { randomBytes } from'node:crypto';//ランダムデータ生成関数
import { pool } from './db.js';//現在のディレクトリ



//cookieのセッションを確認・発行する
export async function session(req: Request, res: Response, next: NextFunction){

  //cookieを読む
  let  sessionid = (req.headers.cookie || '').split(';').map(part => part.trim())
  .find(part => part.startsWith('session_id='))?.slice('session_id='.length);



  //cookieが見つからなかったら
  if (!sessionid) {
    sessionid = randomBytes(32).toString('hex');//新しいセッションID作成

    //cookieを発行
    res.cookie('session_id', sessionid, {
      httpOnly: true, sameSite: 'lax', secure: false, path: '/'
    });

    //DBに保存
    await pool.query(
    'INSERT INTO sessions (session_id) VALUES($1)',[sessionid]);

    //cookieにIDを渡す。
    req.sessionId = sessionid
  }



  //データベース読む
  const DB = await pool.query('SELECT session_id,current_order_id,created_at FROM sessions WHERE session_id= $1',[sessionid]);

  //DBの記録になかった場合
  if (!DB.rows.length) {
    sessionid = randomBytes(32).toString('hex');//新しいセッションID作成
    res.cookie('session_id', sessionid, {//cookieを発行
      httpOnly: true, sameSite: 'lax', secure: false, path: '/'
    });
    //DBに保存
    await pool.query(
    'INSERT INTO sessions (session_id) VALUES($1)',[sessionid]);
    //cookieにIDを渡す。
    req.sessionId = sessionid
  }


  else{req.sessionId = sessionid}

  next();
}