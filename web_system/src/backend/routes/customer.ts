import express from "express";
import { pool } from "../app/db.js";
import { session } from "../app/session.js";
import { subscribeOrder } from "../app/orderEvents.js";
import { notifyNewOrder } from "../app/orderEvents.js";
import { notifychangeSeat } from "../app/orderEvents.js";

const router = express.Router();
class OutOfStockError extends Error {}

//メニューを返すAPI
router.get(
    "/menu",
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
router.post(
    "/order",
    session,//お客さん識別
    //ハンドラ
    async (req, res) => {
        //値段を取り出し、
        const cart = req.body?.cart;
        if (
            !cart ||
            typeof cart !== 'object' ||
            Array.isArray(cart) ||
            Object.keys(cart).length === 0
        ) {
            return res.status(400).json({ error: 'cartにエラーあり' });
        }
        console.log("cart:", cart);
        
        for (const [item_id, item_qty] of Object.entries(cart)) {
            const id = Number(item_id);
            const qty = Number(item_qty);

            if (!Number.isInteger(id) || id < 1) {
                return res.status(400).json({ error: '商品IDにエラーあり' });
            }

            if (!Number.isInteger(qty) || qty < 1) {
                return res.status(400).json({ error: '商品個数にエラーあり' });
            }
        }



        const order_type = req.body?.order_type;
        const seat_id = req.body?.seat_id;
        const people = req.body?.people;

        if (order_type !== "EAT_IN" && order_type !== "TAKE_OUT") {
            return res.status(400).json({ error: "order_typeにエラーあり" });
        }
        if (order_type === "EAT_IN") {
            if (!Number.isInteger(seat_id) || seat_id < 1) {
                return res.status(400).json({ error: "seat_idにエラーあり" });
            }

            if (!Number.isInteger(people) || people < 1) {
                return res.status(400).json({ error: "peopleにエラーあり" });
            }
        } else {
            if (seat_id !== null || people !== null) {
                return res.status(400).json({ error: "テイクアウトの注文情報にエラーあり" });
            }
        }
        console.log("order_type:", order_type);
        console.log("seat_id:", seat_id);
        console.log("people:", people);


        //トランザクションはここから(=^・^=)
        const client = await pool.connect();//同じDB接続

        try {
            await client.query('BEGIN');//

            // 合計を計算
            let total_price = 0;
            for (const [item_id, item_qty] of Object.entries(cart)) {
                const result = await client.query(
                    `SELECT price,stock
                    FROM item
                    WHERE item_id = $1`,
                    [Number(item_id)]);
                if (result.rows.length === 0) {
                    throw new Error(`商品ID ${item_id} が存在しません`);
                }
                const price = result.rows[0].price;
                total_price += price * Number(item_qty);
            }
            console.log("total_price:", total_price);



            //注文内容をordersテーブルに保存
            console.log("注文POST ordersに保存する。");


            let order_id;
            //イートインの場合
            if(order_type === "EAT_IN"){
                //DBに保存
                const orderResult =await client.query(
                    `INSERT INTO orders
                    (seat_id, people, order_type, total_price, order_status)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING order_id`,
                    [seat_id,people, order_type, total_price, "unpaid"]
                );
                //order_idだけ取得。（order_itemテーブルに保存する為。
                order_id =orderResult.rows[0].order_id
            }

            //テイクアウトの場合
            if(order_type === "TAKE_OUT"){
                //DBに保存
                const orderResult =await client.query(
                    `INSERT INTO orders
                    (order_type, total_price, order_status)
                    VALUES ($1, $2, $3)
                    RETURNING order_id`,
                    [order_type, total_price, "unpaid"]
                );
                //order_idだけ取得。（order_itemテーブルに保存する為。
                order_id =orderResult.rows[0].order_id
            }

            // 注文内容をorder_itemテーブルに保存
            console.log("注文POST order_item。");

            //在庫があるなら、DBに保存
            for (const [item_id, item_qty] of Object.entries(cart)) {
                const result = await client.query(
                    `SELECT price,stock
                    FROM item
                    WHERE item_id = $1`,
                    [Number(item_id)]);

                if (result.rows.length === 0) {
                    throw new Error(`商品ID ${item_id} が存在しません`);
                }

                const unit_price = result.rows[0].price;

                if (result.rows[0].stock < Number(item_qty)) {
                    throw new OutOfStockError("在庫がありません");
                }

                let itemqty = Number(item_qty);
                for (let i =0; i<Number(item_qty); i++) {
                    await client.query(
                        `INSERT INTO order_item
                        (order_id,item_id,order_qty,unit_price) 
                        VALUES ($1,$2,$3,$4)`,
                        [order_id, Number(item_id),itemqty, unit_price]
                    );
                }
                console.log("order_item保存:", item_id, item_qty, unit_price);
            }
            

            
            // 在庫を減らす
            for (const [item_id, item_qty] of Object.entries(cart)) {
                const result = await client.query(
                    `UPDATE item
                    SET stock = stock - $1
                    WHERE item_id = $2
                    AND stock >= $1
                    RETURNING stock`,
                    [Number(item_qty), Number(item_id)]
                );

                if (result.rowCount === 0) {
                    throw new OutOfStockError(
                        `商品ID ${item_id} は在庫不足、または商品が存在しません`
                    );
                }
                console.log("在庫数を変更");
            }

            //注文IDとセッション（cookie）を紐づける
            const sessionid=req.sessionId;
            const sessionResult = await client.query(
                `UPDATE sessions
                SET current_order_id = $1
                WHERE session_id = $2`,
                [order_id,sessionid]
            );
            if (sessionResult.rowCount === 0) {
                throw new Error("セッションが見つかりません");
            }
            console.log("注文IDとセッション(cookie)を紐づけ完了");




            await client.query('COMMIT');//成功したのでDB確定する

            // 店頭画面に新規注文を通知
            notifyNewOrder(order_id);

            if (order_type === "EAT_IN") {
                notifychangeSeat(order_id);
            }

            res.status(201).json({ order_id, total_price });
            console.log("注文を受け付けました");
            
            } catch (error) {
                try {
                    await client.query('ROLLBACK');
                } catch (rollbackError) {
                    console.error("ROLLBACKに失敗しました:", rollbackError);
                }

                console.error("注文処理に失敗しました:", error);

                if (error instanceof OutOfStockError) {
                    return res.status(409).json({ error: error.message });
                }

                return res.status(500).json({ error: '注文処理に失敗しました' });
            } finally {
                client.release();
            }

    }
);




//SSE処理　エンドポイント
router.get("/order/events", session, async (req, res) => {
    const orderId = Number(req.query.order_id);

    if (!Number.isInteger(orderId) || orderId < 1) {
        return res.status(400).json({ error: "order_idにエラーあり" });
    }

    // セッションに紐づいた注文だけを監視できるようにする
    const sessionId = req.sessionId;

    const result = await pool.query(
        `SELECT current_order_id
         FROM sessions
         WHERE session_id = $1`,
        [sessionId]
    );

    if (
        result.rows.length === 0 ||
        Number(result.rows[0].current_order_id) !== orderId
    ) {
        return res.status(403).json({ error: "この注文を監視できません" });
    }

    // 接続前にすでに支払い済みになっていないか確認
    const orderResult = await pool.query(
        `SELECT order_status
         FROM orders
         WHERE order_id = $1`,
        [orderId]
    );

    if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: "注文が見つかりません" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    if (orderResult.rows[0].order_status === "paid") {
        res.write(`data: ${JSON.stringify({
            order_id: orderId,
            order_status: "paid",
        })}\n\n`);
        return res.end();
    }

    subscribeOrder(orderId, res);
});




export default router;
