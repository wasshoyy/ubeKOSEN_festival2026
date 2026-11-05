//server.ts
import dotenv from "dotenv";
import express from "express";
import path  from "path";

import customerRouter from "../routes/customer.js";
import staffRouter from "../routes/staff.js";
import robotRouter from "../routes/robot.js";


const __dirname = import.meta.dirname;
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });


const app = express();
console.log("① app作成");


//これで、req.body.ooが読み取れるように!!!
app.use(express.json());


// フロントエンドのディレクトリ
const frontendPath = path.resolve(__dirname, "../../../frontend");

// 広告サイト
const websitePath = path.join(frontendPath, "website", "public");
app.use(express.static(websitePath));

// 注文アプリ
const customerPath = path.join(frontendPath, "customer", "public");


// 注文アプリのファイルを /app 以下で配信
app.use("/app", express.static(customerPath));

// 注文アプリの入口
app.get("/app/", (req, res) => {
    res.sendFile(path.join(customerPath, "menu.html"));
});

// 店員用画面
const counterPath = path.join(frontendPath, "counter", "public");
app.use("/counter", express.static(counterPath));

app.get("/counter", (req, res) => {
    res.sendFile(path.join(counterPath, "counter.html"));
});

app.get("/counter/", (req, res) => {
    res.sendFile(path.join(counterPath, "counter.html"));
});

// 厨房用画面
const kitchenPath = path.join(frontendPath, "kitchen", "public");
app.use("/kitchen", express.static(kitchenPath));

app.get("/kitchen", (req, res) => {
    res.sendFile(path.join(kitchenPath, "kitchen.html"));
});

app.get("/kitchen/", (req, res) => {
    res.sendFile(path.join(kitchenPath, "kitchen.html"));
});


// 座席管理画面
app.get("/seat", (req, res) => {
    res.sendFile(path.join(counterPath, "seat.html"));
});

app.get("/seat/", (req, res) => {
    res.sendFile(path.join(counterPath, "seat.html"));
});



// API
app.use("/api/customer", customerRouter);
app.use("/api/staff", staffRouter);
app.use("/api/robot", robotRouter);



// サーバー起動
const server = app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
