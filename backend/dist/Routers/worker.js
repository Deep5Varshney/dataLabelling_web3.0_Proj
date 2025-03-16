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
exports.WORKER_JWT_SECRET = void 0;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const __1 = require("..");
const express_1 = require("express");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
const prismaClient = new client_1.PrismaClient();
exports.WORKER_JWT_SECRET = __1.JWT_SECRET + "worker";
router.get("/nextTask", middleware_1.workerauthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.userId;
        const task = yield prismaClient.task.findFirst({
            where: {
                done: false,
                submissons: {
                    none: {
                        worker_id: userId,
                    },
                },
            },
            select: {
                title: true,
                options: true,
            },
        });
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
