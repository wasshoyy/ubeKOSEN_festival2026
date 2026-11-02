//robot.ts
import express from "express";
import { pool } from "../app/db.js";
import { subscribeClient, notifyRobotAssignment, notifyRobotReady } from "../app/robotEvents.js";
const router = express.Router();


// SSE接続の確立
router.get("/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    subscribeClient(res);
});


setTimeout(() => {
    notifyRobotAssignment(1, 2, 3);
}, 1000);


// ローカルサーバーからロボットの状態を更新
router.put("/status", async (req, res) => {
    const robtoId = req.body?.robotId;
    const connection = req.body?.connection;
    const status = req.body?.status;

    if (!Number.isInteger(robtoId) || robtoId < 0) {
        return res.status(400).json ({ error: "robotIdにエラーあり" });
    }
    if (connection !== "not_connected" && connection !== "connected") {
        return res.status(400).json ({ error: "connectionにエラーあり" });
    }

    // statusの種類と名前、変更の可能性あり
    if (
        status !== "Waiting_order" &&
        status !== "Ready" &&
        status !== "Running" &&
        status !== "Waiting_customer"
    ) {
        return res.status(400).json ({ error: "statusにエラーあり" });
    }
    
    console.log(`robtoId: ${robtoId}`);
    console.log(`connection: ${connection}`);
    console.log(`status: ${status}`);

    /*
    //トランザクションはここから(=^・^=)
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE robot
            SET connection_status = $2,
                status = $3
            WHERE robot_id = $1`,
            [robtoId, connection, status]
        );

        if (result.rowCount !== 1) {

        }

        console.log("");

        res.status(204);
        console.log("注文を受け付けました");
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error("ROLLBACKに失敗しました:", rollbackError);
        }

        console.error("ロボット情報の更新に失敗しました:", error);

        return res.status(500).json({ error: 'ロボット情報の更新に失敗しました' });
    }
    */

});



export default router;