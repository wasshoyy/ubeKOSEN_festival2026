//server.ts
import dotenv from "dotenv";
import express from "express";
import { pool } from "./db.js";//現在のディレクトリ
import { session } from "./session.js";
import path  from "path";
const __dirname = import.meta.dirname;//appを指す
dotenv.config({ path: "../../.env" });

const app = express();
console.log("① app作成");


//これで、req.body.ooが読み取れるように!!!
app.use(express.json());

// 'public'ディレクトリの中身(menu.html)だけを静的ファイルとして公開
app.use(express.static(path.join(__dirname, '..', '..','..','frontend','customer','public')));



//メニューを返すAPI
app.get(
    "/api/customer/menu",
    session,//お客さん識別
    //ハンドラ
    async (req, res) => {
        console.log("cookie処理完了、メニュー取り出す");
        // console.log("③ handlerまで来た");
        // res.json(req.sessionId);
        const result = await pool.query('SELECT item_id, item_name, price, stock FROM item ORDER BY item_id');
        //resultにはデータの行だけでなく、色んな情報も含まれているので、.rowsで行だけを取り出す
        res.json(result.rows);
    }
);


//注文確定時のAPI
app.post(
    "/api/customer/order",
    session,//お客さん識別
    //ハンドラ
    async (req, res) => {
        //値段を取り出し、
        const cart = req.body?.cart;
        if (!cart || typeof cart !== 'object' || Array.isArray(cart)) {
            return res.status(400).json({ error: 'cartにエラーあり' });
        }
        console.log("cart:", cart);

        // 合計を計算
        let total_price = 0;
        for (const [item_id, item_qty] of Object.entries(cart)) {
            const result = await pool.query(
                'SELECT price,stock FROM item WHERE item_id = $1',
                [Number(item_id)]);
            const price = result.rows[0].price;
            total_price += price * Number(item_qty);
        }
        console.log("total_price:", total_price);




        //トランザクション

        //注文内容をordersテーブルに保存
        console.log("注文POST ordersに保存する。");

        const people = req.body?.people;
        //peopleがnullじゃない（テイクイン）　かつ　型が違うなら
        if (people !== null && typeof people !== 'number') {
            return res.status(400).json({ error: 'peopleにエラーあり' });
        }
        console.log("people:", people);
        
        const order_type = req.body?.order_type;
        if (!order_type || typeof order_type !== 'string') {
            return res.status(400).json({ error: 'order_typeにエラーあり' });
        }
        console.log("order_type:", order_type);

        //DBに保存
        const orderResult =await pool.query(
            `INSERT INTO orders
            (people, order_type, total_price, order_status)
            VALUES ($1, $2, $3, $4)
            RETURNING order_id`,
            [people, order_type, total_price, "unpaid"]
        );

        //order_idだけ取得。（order_itemテーブルに保存する為。
        const order_id =orderResult.rows[0].order_id
        
        // 注文内容をorder_itemテーブルに保存
        console.log("注文POST order_item。");

        //DBに保存
        for (const [item_id, item_qty] of Object.entries(cart)) {
            const result = await pool.query(
                'SELECT price,stock FROM item WHERE item_id = $1',
                [Number(item_id)]);
            const unit_price = result.rows[0].price;

            await pool.query(
                `INSERT INTO order_item
                (order_id,item_id,order_qty,unit_price) 
                VALUES ($1,$2,$3,$4)`,
                [order_id, Number(item_id), Number(item_qty), unit_price]
            );
            console.log("order_item保存:", item_id, item_qty, unit_price);
        }


    //     // 在庫を減らす

    //     res.status(200).json({
    //         message: "注文データを受け取りました",
            
    //     });
    }
        
);











const server = app.listen(3000, () => {
    console.log("④ Server is running");
});

console.log("⑤ server.tsの最後");

