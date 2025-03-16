"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOTAL_DECIMALS = exports.WORKER_JWT_SECRET = void 0;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const __1 = require("..");
const express_1 = require("express");
const middleware_1 = require("../middleware");
const db_1 = require("../db");
const types_1 = require("../types");
const router = (0, express_1.Router)();
const prismaClient = new client_1.PrismaClient();
exports.WORKER_JWT_SECRET = __1.JWT_SECRET + "worker";
const TOTAL_SUBMISSIONS = 100;
exports.TOTAL_DECIMALS = 1000000;
router.get("/balance", middleware_1.workerauthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const userId = req.userId;
    const worker = yield prismaClient.worker.findFirst({
        where: {
            id: Number(userId)
        }
    });
    res.json({
        pendingAmount: worker === null || worker === void 0 ? void 0 : worker.pending_amount,
        lockedAmount: worker === null || worker === void 0 ? void 0 : worker.locked_amount
    });
}));
router.post("/submission", middleware_1.workerauthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const userId = req.userId;
    const body = req.body;
    const parsedBody = types_1.createSubmissionInput.safeParse(body);
    if (parsedBody.success) {
        const task = yield (0, db_1.getNextTask)(Number(userId));
        if (!task || (task === null || task === void 0 ? void 0 : task.id) !== Number(parsedBody.data.taskId)) {
            res.json({
                message: "Incorrect task id"
            });
            return;
        }
        const amount = (Number(task.amount) / TOTAL_SUBMISSIONS);
        const submission = yield prismaClient.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const submission = yield tx.submission.create({
                data: {
                    option_id: Number(parsedBody.data.selection),
                    worker_id: userId,
                    task_id: Number(parsedBody.data.taskId),
                    amount
                }
            });
            yield tx.worker.update({
                where: {
                    id: userId
                },
                data: {
                    pending_amount: {
                        increment: Number(amount)
                    }
                }
            });
            return submission;
        }));
        const nexttask = yield (0, db_1.getNextTask)(Number(userId));
        res.json({
            nexttask,
            amount
        });
    }
    else {
    }
}));
router.get("/nextTask", middleware_1.workerauthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.userId;
        const task = yield (0, db_1.getNextTask)(Number(userId));
        if (!task) {
            res.json({ message: "No more tasks left for you to review" });
            return;
        }
        res.json(task);
    }
    catch (error) {
        console.error("Error fetching next task:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const hardCodedWalletAddress = "CtdHux3iiindZ12Mt4ShDNtD2AinQapWMWTbPRbnBDve";
    const existingUser = yield prismaClient.worker.findFirst({
        where: {
            address: hardCodedWalletAddress
        }
    });
    if (existingUser) {
        const token = jsonwebtoken_1.default.sign({
            userId: existingUser.id
        }, exports.WORKER_JWT_SECRET);
        res.json({
            token
        });
    }
    else {
        const user = yield prismaClient.worker.create({
            data: {
                address: hardCodedWalletAddress,
                pending_amount: 0,
                locked_amount: 0
            }
        });
        const token = jsonwebtoken_1.default.sign({
            userId: user.id
        }, exports.WORKER_JWT_SECRET);
        res.json({
            token
        });
    }
}));
exports.default = router;
