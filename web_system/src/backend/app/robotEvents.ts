// app/robotEvent.ts
// SSE用の関数たち

import type { Response } from "express";


// 接続中のブラウザを管理
const clients = new Set<Response>();

// SSE接続を登録する
export function subscribeClient(res: Response) {
    clients.add(res);

    console.log("SSE接続完了");
    res.on("close", () => {
        clients.delete(res);
    });
}


// ロボットに配膳タスクを割り振る(ことを接続中のブラウザへ通知)
export function notifyRobotAssignment(robotId: number, orderId: number, tableId: number) {
    if (clients.size === 0) return;
    
    const message = 
    `event: assignment\n` +
    `data: ${JSON.stringify({
        robot_id: robotId,
        order_id: orderId,
        table_id: tableId,
    })}\n\n`;

    for (const res of clients) {
        res.write(message);
    }
}

// 指定ロボットの発進準備の完了を接続中のブラウザへ通知
export function notifyRobotReady(robotId: number) {
    const message = 
    `event: ready\n` +
    `data: ${JSON.stringify({
        robot_id: robotId,
    })}\n\n`;

    for (const res of clients) {
        res.write(message);
    }
}