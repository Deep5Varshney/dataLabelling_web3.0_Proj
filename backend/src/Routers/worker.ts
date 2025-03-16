import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "..";
import {Router} from "express";
import { workerauthMiddleware } from "../middleware";
import { getNextTask } from "../db";
import { createSubmissionInput } from "../types";
const router = Router();

const prismaClient = new PrismaClient();
export const WORKER_JWT_SECRET = JWT_SECRET + "worker";
const TOTAL_SUBMISSIONS =100;
export const TOTAL_DECIMALS = 1000_000;

router.post("/payout", workerauthMiddleware, async (req, res) => {
     // @ts-ignore
     const userId: string = req.userId;
     const worker = await prismaClient.worker.findFirst({
         where: { id: Number(userId) }
     })

     if (!worker) {
         res.status(403).json({
            message: "User not found"
        })
        return
    }

    const address = worker.address;
    const txnId = "0x3678239";
    await prismaClient.$transaction(async tx => {
        await tx.worker.update({
            where: {
                id: Number(userId)
            },
            data: {
                pending_amount: {
                    decrement: worker.pending_amount
                },
                locked_amount: {
                    increment: worker.pending_amount
                }
            }
        })

        await tx.payouts.create({
            data: {
                user_id: Number(userId),
                amount: worker.pending_amount,
                status: "Processing",
                signature: txnId
            }
        })
    })

    res.json({
        message: "Processing payout",
        amount: worker.pending_amount
    })

})

router.get("/balance", workerauthMiddleware, async(req, res)=>{
    // @ts-ignore
    const userId : string = req.userId;
    const worker  = await prismaClient.worker.findFirst({
        where:{
            id: Number(userId)
        }
    })

    res.json({
        pendingAmount: worker ?.pending_amount,
        lockedAmount : worker ?.locked_amount
    })
})

router.post("/submission", workerauthMiddleware, async (req, res)=>{
    // @ts-ignore
    const userId = req.userId;
    const body = req.body;
    const parsedBody = createSubmissionInput.safeParse(body);

    if(parsedBody.success){
        const task = await getNextTask(Number(userId));
        if(!task || task?.id !== Number(parsedBody.data.taskId)){
            res.json({
                message :"Incorrect task id"
            })
            return
        }

        const amount  = (Number(task.amount)/TOTAL_SUBMISSIONS);

        const submission = await prismaClient.$transaction(async tx =>{
            const submission = await tx.submission.create({
                data :{
                    option_id: Number(parsedBody.data.selection),
                    worker_id: userId,
                    task_id: Number(parsedBody.data.taskId),
                    amount 
                }
            })

            await tx.worker.update({
                where:{
                    id: userId
                },
                data:{
                    pending_amount:{
                        increment: Number(amount)
                    }
                }
            })

            return submission
        })
        const nexttask = await getNextTask(Number(userId));
        res.json({
            nexttask,
            amount
        })

    }else{

    }
})

router.get("/nextTask", workerauthMiddleware, async (req, res) => {
    try {
        // @ts-ignore
        const userId : string = req.userId;

        const task  = await getNextTask(Number(userId));

        if (!task) {
            res.json({ message: "No more tasks left for you to review" });
            return
        }

        res.json(task);
    } catch (error) {
        console.error("Error fetching next task:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/signin", async(req, res)=>{
    const hardCodedWalletAddress = "CtdHux3iiindZ12Mt4ShDNtD2AinQapWMWTbPRbnBDve";
        const existingUser = await prismaClient.worker.findFirst({
            where :{
                address : hardCodedWalletAddress
            }
        })
    
        if(existingUser){
            const token  = jwt.sign({
                userId : existingUser.id
            }, WORKER_JWT_SECRET ) 
    
            res.json({
                token
            })
        }else{
            const user = await prismaClient.worker.create({
                data :{
                    address : hardCodedWalletAddress,
                    pending_amount:0,
                    locked_amount:0
                }
            }) 
    
            const token  = jwt.sign({
                userId : user.id
            },WORKER_JWT_SECRET )
    
            res.json({
                token
            })
        }

});

export default router;