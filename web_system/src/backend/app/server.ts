//server.ts
import dotenv from "dotenv";
import express from "express";
import path  from "path";

import customerRouter from "../routes/customer.js";
import staffRouter from "../routes/staff.js";


const __dirname = import.meta.dirname;//appを指す
dotenv.config({ path: "../../.env" });

const app = express();
console.log("① app作成");


//これで、req.body.ooが読み取れるように!!!
app.use(express.json());

// 'public'ディレクトリの中身(menu.htmlとか)だけを静的ファイルとして公開
app.use(express.static(path.join(__dirname, '..', '..','..','frontend','customer','public')));
app.use(express.static(path.join(__dirname, '..', '..','..','frontend','counter','public')));
app.use(express.static(path.join(__dirname, '..', '..','..','frontend','kitchen','public')));


app.use("/api/customer", customerRouter);
app.use("/api/staff", staffRouter);





const server = app.listen(3000, () => {
    console.log("④ Server is running");
});

console.log("⑤ server.tsの最後");

