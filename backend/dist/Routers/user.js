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
const __1 = require("..");
const client_1 = require("@prisma/client");
const express_1 = require("express");
const router = (0, express_1.Router)();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const middleware_1 = require("../middleware");
const prismaClient = new client_1.PrismaClient();
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_presigned_post_1 = require("@aws-sdk/s3-presigned-post");
const types_1 = require("../types");
const worker_1 = require("./worker");
const DEFAULT_TITLE = "Select the most suitable option";
const s3Client = new client_s3_1.S3Client({
    credentials: {
        accessKeyId: "AKIASFIXCPRCK3X2AKGG",
        secretAccessKey: "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"
    },
    region: "eu-north-1"
});
router.get("/task", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const taskId = req.query.taskId;
    // @ts-ignore
    const userId = req.userId;
    const taskDetails = yield prismaClient.task.findFirst({
        where: {
            user_id: Number(userId),
            id: Number(taskId)
        },
        include: {
            options: true
        }
    });
    if (!taskDetails) {
        res.json({ message: "You don't have access to this task." });
        return;
    }
    const responses = yield prismaClient.submission.findMany({
        where: {
            task_id: Number(taskId)
        },
        include: {
            option: true
        }
    });
    const result = {};
    taskDetails.options.forEach(option => {
        result[option.id] = {
            count: 1,
            option: {
                imageUrl: option.image_url
            }
        };
    });
    responses.forEach(r => {
        result[r.option_id].count++;
    });
    res.json({
        result
    });
}));
router.post("/task", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const userId = req.userId;
    const body = req.body;
    const parseData = types_1.createtaskInput.safeParse(body);
    if (!parseData.success) {
        res.status(400).json({ message: "You've sent the wrong inputs" });
        return;
    }
    try {
        const response = yield prismaClient.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const task = yield tx.task.create({
                data: {
                    title: (_a = parseData.data.title) !== null && _a !== void 0 ? _a : DEFAULT_TITLE,
                    amount: 1 * worker_1.TOTAL_DECIMALS,
                    signature: parseData.data.signature,
                    user_id: userId
                }
            });
            yield tx.option.createMany({
                data: parseData.data.options.map(x => ({
                    image_url: x.imageUrl,
                    task_id: task.id
                }))
            });
            return { id: task.id.toString() };
        }));
        res.json({ id: response.id });
    }
    catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}));
router.get("/presignedurl", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId; // Type assertion
    if (!userId) {
        res.status(403).json({ message: "Unauthorized" });
        return; // Ensure function returns
    }
    try {
        const { url, fields } = yield (0, s3_presigned_post_1.createPresignedPost)(s3Client, {
            Bucket: 'decentralizedplatform',
            Key: `decentralized/${userId}/${Math.random()}/image.jpg`,
            Conditions: [
                ['content-length-range', 0, 5 * 1024 * 1024] // 5 MB max
            ],
            Fields: {
                'Content-Type': 'image/png'
            },
            Expires: 3600
        });
        console.log({ url, fields });
        //console.log(preSignedUrl);
        res.json({ preSignedUrl: url, fields });
    }
    catch (error) {
        console.error("Error generating pre-signed URL:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}));
// signin with wallet
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const hardCodedWalletAddress = "CtdHux3iiindZ12Mt4ShDNtD2AinQapWMWTbPRbnBDve";
    const existingUser = yield prismaClient.user.findFirst({
        where: {
            address: hardCodedWalletAddress
        }
    });
    if (existingUser) {
        const token = jsonwebtoken_1.default.sign({
            userId: existingUser.id
        }, __1.JWT_SECRET);
        res.json({
            token
        });
    }
    else {
        const user = yield prismaClient.user.create({
            data: {
                address: hardCodedWalletAddress
            }
        });
        const token = jsonwebtoken_1.default.sign({
            userId: user.id
        }, __1.JWT_SECRET);
        res.json({
            token
        });
    }
}));
exports.default = router;
