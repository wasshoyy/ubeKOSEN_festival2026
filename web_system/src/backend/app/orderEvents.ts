//app/orderEvents.ts
//SSEを管理するやつ

import type { Response } from "express";



// order_idごとに、接続中のブラウザを管理
const clients = new Map<number, Set<Response>>();

//指定された注文のSSE接続を登録する
export function subscribeOrder(orderId: number, res: Response) {
    if (!clients.has(orderId)) {
        clients.set(orderId, new Set());
    }

    clients.get(orderId)!.add(res);

    res.on("close", () => {
        const subscribers = clients.get(orderId);
        if (!subscribers) return;

        subscribers.delete(res);

        if (subscribers.size === 0) {
            clients.delete(orderId);
        }
    });
}


//その注文が支払い済みになったとき、接続中のブラウザへ通知
export function notifyOrderPaid(orderId: number) {
    const subscribers = clients.get(orderId);
    if (!subscribers) return;

    const message = `data: ${JSON.stringify({
        order_id: orderId,
        order_status: "paid",
    })}\n\n`;

    for (const res of subscribers) {
        res.write(message);
        res.end();
    }

    clients.delete(orderId);
}





//注文確定したとき、接続中のブラウザへ通知する

// 店頭画面：新規注文を待っている接続
const newOrderClients = new Set<Response>();

// 店頭画面の接続を登録する
export function subscribeNewOrders(res: Response) {
    newOrderClients.add(res);

    res.on("close", () => {
        newOrderClients.delete(res);
    });
}

// 新しい注文が確定したら、店頭画面に通知
export function notifyNewOrder(orderId: number) {
    const message = `data: ${JSON.stringify({
        event_type: "order_created",
        order_id: orderId,
    })}\n\n`;

    for (const res of newOrderClients) {
        res.write(message);
    }
}





//席情報が変わったら通知
const seats = new Set<Response>();

// 席管理画面の接続を登録する
export function subscribeChangeSeat(res: Response) {
    seats.add(res);

    res.on("close", () => {
        seats.delete(res);
    });
}

export function notifychangeSeat(orderId: number) {
    const message = `data: ${JSON.stringify({
        event_type: "seat_change",
        order_id: orderId,
    })}\n\n`;

    for (const res of seats) {
        res.write(message);
    }
}





//席情報が変わったら通知
const paid_order = new Set<Response>();

// 席管理画面の接続を登録する
export function subscribeNewPaidOrders(res: Response) {
    paid_order.add(res);

    res.on("close", () => {
        paid_order.delete(res);
    });
}

export function notifyNewPaidOrders(orderId: number) {
    const message = `data: ${JSON.stringify({
        event_type: "paid",
        order_id: orderId,
    })}\n\n`;

    for (const res of paid_order) {
        res.write(message);
    }
}




//delivery_statusが変わったら通知
const delivery = new Set<Response>();

// 席管理画面の接続を登録する
export function subscribeDeliverted(res: Response) {
    delivery.add(res);

    res.on("close", () => {
        delivery.delete(res);
    });
}

export function notifyDeliverted(orderId: number) {
    const message = `data: ${JSON.stringify({
        event_type: "deliverted",
        order_id: orderId,
    })}\n\n`;

    for (const res of delivery) {
        res.write(message);
    }
}