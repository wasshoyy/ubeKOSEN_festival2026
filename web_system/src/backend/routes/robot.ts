//robot.ts
import express from "express";
import { pool } from "../app/db.js";
import { subscribeClient, notifyRobotAssignment } from "../app/robotEvents.js";

const router = express.Router();


// SSE接続の確立
router.get("/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    subscribeClient(res);
});


setInterval(() => {
    console.log("1秒おきにassignment送信");
    notifyRobotAssignment(0, 2, 0);
    notifyRobotAssignment(1, 2, 0);
}, 1000);


// ローカルサーバーからロボットの状態を更新
router.put("/status", async (req, res) => {
    const robot_id = req.body?.robot_id;
    const connection = req.body?.connection;
    const status = req.body?.status;

    if (!Number.isInteger(robot_id) || robot_id < 0) {
        return res.status(400).json ({ error: "robot_idにエラーあり" });
    }
    if (connection !== "connected" && connection !== "not_connected") {
        return res.status(400).json ({ error: "connectionにエラーあり" });
    }

    // statusの種類と名前、変更の可能性あり
    if (
        status !== "Waiting_order" &&
        status !== "Ready" &&
        status !== "Running" &&
        status !== "Waiting_customer" &&
        status !== "Send_back"
    ) {
        return res.status(400).json ({ error: "statusにエラーあり" });
    }
    
    console.log(`robot_id: ${robot_id}`);
    console.log(`connection: ${connection}`);
    console.log(`status: ${status}`);

    await pool.query(
        `UPDATE robot
        SET connection_status = $2,
            status = $3
        WHERE robot_id = $1`,
        [robot_id, connection, status]
    );
});



export default router;