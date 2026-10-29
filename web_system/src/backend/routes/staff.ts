//staff.ts
import express from "express";
import { pool } from "../app/db.js";
import { ok } from "assert";
import { notifyDeliverted, notifyOrderPaid, subscribeChangeSeat } from "../app/orderEvents.js";
import { subscribeNewOrders } from "../app/orderEvents.js";
import { subscribeNewPaidOrders } from "../app/orderEvents.js";
import { notifyNewPaidOrders } from "../app/orderEvents.js";
import { subscribeDeliverted } from "../app/orderEvents.js";

const router = express.Router();


// 注文の支払い情報を返すAPI
router.get(
    "/orders",
    //ハンドラ
    async (req, res) => {
        console.log("注文の支払い情報を取り出す");

        //ordersとorder_itemをJOINし、必要なデータ取る。
        const orders = await pool.query(
            `SELECT orders.order_id,orders.total_price,orders.order_status,orders.order_time,orders.seat_id,
                    order_item.item_id,order_item.order_qty,order_item.unit_price,
                    item.item_name
            FROM orders
            INNER JOIN order_item
            ON orders.order_id = order_item.order_id
            INNER JOIN item
            ON item.item_id = order_item.item_id
            ORDER BY orders.order_id ASC`);

        let order_info = [];

        //一行ごとにループ
        for(const order of orders.rows){

            //order_dataはDBからの一行情報を入れておくもの
            const order_data = {
                //注文全体情報
                order_id: order.order_id,
                total_price: order.total_price,
                order_status: order.order_status,
                order_time: order.order_time,
                seat_id: order.seat_id,
                
                item:
                    {//購入した一商品ずつの情報
                        item_id: order.item_id,
                        item_name: order.item_name,
                        order_qty: order.order_qty
                    }
                
            };
            
            const found = order_info.find(
            //order_infoに、今のorder_dataのorder_idがあるかどうか
                (order_data) => order_data.order_id === order.order_id
            );
            //もし無いなら
            if (found === undefined) {
                // 新しい注文を作る
                const items= [order_data.item];
                order_info.push({
                    order_id: order_data.order_id,
                    total_price: order_data.total_price,
                    order_status: order_data.order_status,
                    order_time: order_data.order_time,
                    seat_id: order_data.seat_id,
                    items: [order_data.item]
                });
            }
            else {//もうこのorder_idのやつがある（found.item）なら 
                // 既存の注文（found.item）に今回の商品（order_data）を追加する
                found.items.push(order_data.item);
            }


            console.log(found);
        }
        console.log("注文情報を取得");
        res.json({order_info});
    }
);



//order_statusのやつを変更＆配送タスクを作成するAPI
router.post(
    "/orders/pay",
    //ハンドラ
    async (req, res) => {
        const order_id = req.body.order_id;
        if (!Number.isInteger(order_id) || order_id < 1) {
            return res.status(400).json({ error: "order_idにエラーあり" });
        }

        //トランザクションはここから(=^・^=)
        const client = await pool.connect();//同じDB接続
        try {
            await client.query('BEGIN');//

            console.log("注文の支払いステータス変更");
            const order = await client.query(
                `SELECT order_id, order_type, order_status
                FROM orders
                WHERE order_id = $1
                FOR UPDATE`,
                [order_id]
            );

            if (order.rowCount === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({
                    error: "指定のorder_idは見つかりませんでした"
                });
            }
            const order_type = order.rows[0].order_type;
            const order_status = order.rows[0].order_status;

            if (order_status === "paid") {
                await client.query("ROLLBACK");
                return res.status(200).json({
                    message: "すでに支払い済みです",
                    order_id,
                    order_status: "paid"
                });
            }
            await client.query(
                `UPDATE orders 
                SET order_status =$1
                WHERE order_id = $2`,
                ["paid",order_id]
            );
            console.log("注文の支払いステータス変更完了");
            
            
            
            //イートインなら配膳タスクありで厨房タスクを作成する
            if(order_type === "EAT_IN") {
                console.log("イートイン：配送タスク作成");
                const itemqty = await client.query(
                    `SELECT order_item_id
                    FROM order_item
                    WHERE order_id = $1`,
                    [Number(order_id)]
                );

                //いちorder_item_idごとに、delivery_taskにそのorder_item_idのタスクがないか確認後ないなら作成。
                // 利用可能そうなロボットたちを取得
                const robot_ids = await client.query(
                    `SELECT robot_id
                    FROIM robot
                    WHERE status = 'Waiting_order'`
                );
                // WHERE connection_status = 'connected'
                //   AND status = 'Waiting_order'

                let robot_id;
                if(robot_ids.rows.length !== 0){
                    // 一番番号が若い子を選択
                    robot_id = robot_ids.rows[0].robot_id;
                }
                else{
                    robot_id = 0;
                }
                for (const item of itemqty.rows) {
                    const robot = await client.query(
                        `SELECT connection_status,status
                        FROM robot
                        WHERE robot_id = $1`,
                        [robot_id]
                    );
                    // if(robot.rows[0].connection_status === "not_connected"){
                    //     throw new Error(`robot ${robot.rows[0].robot_id} は接続されていません。`);
                    // }
                    await client.query(
                        `INSERT INTO delivery_tasks
                        (order_item_id, robot_id, cook_status, delivery_status)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT DO NOTHING`,
                        [item.order_item_id, robot_id, "uncook", "undelivery"]
                    );
                }
                console.log("イートイン：配送タスク作成完了");
            }



            //テイクアウトなら配送タスクなしで厨房に送るデータを送る
            if(order_type === "TAKE_OUT") {
                console.log("テイクアウト：厨房タスク作成");

                const itemqty = await client.query(
                    `SELECT order_item_id
                    FROM order_item
                    WHERE order_id = $1`,
                    [Number(order_id)]
                );


                for (const item of itemqty.rows) {
                    await client.query(
                        `INSERT INTO delivery_tasks
                        (order_item_id, robot_id, cook_status, delivery_status)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT DO NOTHING`,
                        [item.order_item_id, null, "uncook", "deliveryed"]
                    );
                }
                console.log("テイクアウト：厨房タスク作成完了");
            }


            await client.query("COMMIT");


            // 支払い完了をSSEで通知
            // 支払い完了を顧客と厨房に通知
            notifyOrderPaid(order_id);
            notifyNewPaidOrders(order_id);

            return res.status(200).json({
                message: "支払い済みに更新しました",
                order_id,
                order_status: "paid"
            });

        } catch (error) {
            await client.query("ROLLBACK");
            console.error("支払い処理に失敗しました:", error);
            return res.status(500).json({
                error: "支払い処理に失敗しました"
            });
        } finally {
            client.release();
        }
    }

);



// 支払い済の注文情報を返すAPI
router.get(
    "/orders/paid",
    //ハンドラ
    async (req, res) => {
        console.log("支払い済の注文情報を取り出す");

        //JOINし、必要なデータ取る。
        const order_items = await pool.query(
            `SELECT
                orders.order_id, orders.seat_id,
                order_item.order_item_id, order_item.item_id,
                item.item_name,
                delivery_tasks.robot_id, delivery_tasks.cook_status, delivery_tasks.delivery_status,
                robot.status AS robot_status
                FROM orders
                INNER JOIN order_item
                    ON orders.order_id = order_item.order_id
                INNER JOIN item
                    ON item.item_id = order_item.item_id
                INNER JOIN delivery_tasks
                    ON delivery_tasks.order_item_id = order_item.order_item_id
                LEFT JOIN robot
                    ON robot.robot_id = delivery_tasks.robot_id
                WHERE orders.order_status = 'paid'
                    AND orders.order_type IN ('EAT_IN', 'TAKE_OUT')
                ORDER BY orders.order_id ASC,
                    order_item.order_item_id ASC;`
        );

        let order_item_info = [];

        //一行ごとにループ
        for(const order_item of order_items.rows){

            const order_item_data = {
                order_id: order_item.order_id,
                seat_id: order_item.seat_id,
                order_item_id: order_item.order_item_id,
                robot_id: order_item.robot_id,
                robot_status: order_item.robot_status,
                cook_status: order_item.cook_status,
                delivery_status: order_item.delivery_status,
                item: {
                    item_id: order_item.item_id,
                    item_name: order_item.item_name
                }
            };
            
            order_item_info.push(order_item_data);

        }
        console.log("支払い済注文情報を取得");
        res.json({order_item_info});
    }
);




//delivery_statusのやつを変更するAPI
router.post("/orders/deli", async (req, res) => {
    const order_item_id = req.body.order_item_id;

    if (!Number.isInteger(order_item_id) || order_item_id < 1) {
        return res.status(400).json({
            error: "order_item_idにエラーあり"
        });
    }

    try {
        console.log("注文の配達ステータス変更");

        const task = await pool.query(
            `SELECT delivery_tasks.delivery_status,
                    delivery_tasks.cook_status,
                    order_item.order_id
            FROM delivery_tasks
            INNER JOIN order_item
                ON delivery_tasks.order_item_id = order_item.order_item_id
            WHERE delivery_tasks.order_item_id = $1`,
            [order_item_id]
        );

        if (task.rows.length === 0) {
            return res.status(404).json({
                error: "配達タスクが見つかりません"
            });
        }

        if (task.rows[0].delivery_status === "deliveryed") {
            return res.status(200).json({
                message: "すでに配達済みです",
                order_item_id,
                delivery_status: "deliveryed"
            });
        }

        
        if (task.rows[0].cook_status === "uncook") {
            return res.status(200).json({
                message: "先に調理してください",
                order_item_id,
                delivery_status: "undelivery",
                cook_status: "uncook"
            });
        }


        await pool.query(
            `UPDATE delivery_tasks
             SET delivery_status = $1
             WHERE order_item_id = $2`,
            ["deliveryed", order_item_id]
        );


        //すべての注文が届いたかどうか、
        const remaining = await pool.query(
            `SELECT COUNT(*) AS count
            FROM delivery_tasks
            INNER JOIN order_item
                ON delivery_tasks.order_item_id = order_item.order_item_id
            WHERE order_item.order_id = $1
            AND delivery_tasks.delivery_status <> 'deliveryed'`,
            [task.rows[0].order_id]
        );


        console.log("注文の配達ステータス変更完了");
        if (Number(remaining.rows[0].count) === 0) {
            notifyDeliverted(task.rows[0].order_id);
        }


        return res.status(200).json({
            message: "配達ステータスを更新しました",
            order_item_id,
            delivery_status: "deliveryed"
        });

    } catch (error) {
        console.error("配達ステータス更新に失敗しました:", error);
        return res.status(500).json({
            error: "配達ステータス更新に失敗しました"
        });
    }
});




//cook_statusのやつを変更するAPI
router.post("/orders/cook", async (req, res) => {
    const order_item_id = req.body.order_item_id;

    if (!Number.isInteger(order_item_id) || order_item_id < 1) {
        return res.status(400).json({
            error: "order_item_idにエラーあり"
        });
    }

    try {
        console.log("注文の調理ステータス変更");

        const task = await pool.query(
            `SELECT cook_status
             FROM delivery_tasks
             WHERE order_item_id = $1`,
            [order_item_id]
        );

        if (task.rows.length === 0) {
            return res.status(404).json({
                error: "配達タスクが見つかりません"
            });
        }

        if (task.rows[0].cook_status === "cooked") {
            return res.status(200).json({
                message: "すでに調理済みです",
                order_item_id,
                cook_status: "cooked"
            });
        }

        await pool.query(
            `UPDATE delivery_tasks
             SET cook_status = $1
             WHERE order_item_id = $2`,
            ["cooked", order_item_id]
        );

        console.log("注文の調理ステータス変更完了");

        return res.status(200).json({
            message: "調理ステータスを更新しました",
            order_item_id,
            cook_status: "cooked"
        });

    } catch (error) {
        console.error("調理ステータス更新に失敗しました:", error);
        return res.status(500).json({
            error: "調理ステータス更新に失敗しました"
        });
    }
});





// seat情報を返すAPI
router.get(
    "/seats",
    //ハンドラ
    async (req, res) => {
        console.log("seat情報を取得");
        const result = await pool.query(
            `SELECT seat.seat_id,
                    COALESCE(SUM(orders.people), 0) AS people
            FROM seat
            LEFT JOIN orders
                ON orders.seat_id = seat.seat_id
                AND orders.seat_released_at IS NULL
            GROUP BY seat.seat_id
            ORDER BY seat.seat_id ASC;`
        );
        
        res.json({ order_info: result.rows });
    }
);




// 新規注文を待ち受けるSSE
router.get("/order-events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    subscribeNewOrders(res);
});




// 席情報更新を待ち受けるSSE
router.get("/change-seats", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    subscribeChangeSeat(res);
});




// 支払済の新規注文を待ち受けるSSE
router.get("/NewPaidOrder", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    subscribeNewPaidOrders(res);
});



// 配膳情報更新を待ち受けるSSE
router.get("/delivery-events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    subscribeDeliverted(res);
});

export default router;