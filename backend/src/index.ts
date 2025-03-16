import express from "express";
import userRouter from "./Routers/user";
import workerRouter from "./Routers/worker";
import cors from "cors";
const app = express();
app.use(cors());
app.use(express.json());
export const JWT_SECRET = "dhquwey982137";

app.use("/v1/user", userRouter);
app.use("/v1/worker", workerRouter);

app.listen(3000);
