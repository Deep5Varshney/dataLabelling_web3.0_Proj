import { JWT_SECRET } from "..";
import { PrismaClient } from "@prisma/client";
import {response, Router} from "express";
const router = Router();
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware";
import { Request, Response } from "express";

const prismaClient = new PrismaClient();

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { createtaskInput } from "../types";
import { TOTAL_DECIMALS } from "./worker";
const DEFAULT_TITLE = "Select the most suitable option";

const s3Client = new S3Client({
    credentials:{
        accessKeyId : "AKIASFIXCPRCK3X2AKGG",
        secretAccessKey :"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"
    },
    region : "eu-north-1"
})

interface AuthRequest extends Request {
    userId?: string;
  }

  router.get("/task", authMiddleware, async(req, res)=>{
    // @ts-ignore
    const taskId : string = req.query.taskId;
    // @ts-ignore
    const userId : string = req.userId;

    const taskDetails = await prismaClient.task.findFirst({
        where :{
            user_id : Number(userId),
            id : Number(taskId)
        },
        include:{
            options: true
        }
    }) 

    if(!taskDetails){
        res.json({message : "You don't have access to this task."})
        return;
    }

    const responses = await prismaClient.submission.findMany({
        where:{
            task_id: Number(taskId)
        },
        include:{
            option:true
        }
    });

    const result :Record<string,{
        count : number,
        option:{
            imageUrl: string
        }
    }> ={};

    taskDetails.options.forEach(option =>{
        result[option.id] = {
            count :1,
            option:{
                imageUrl: option.image_url
            }
        }
    })

    responses.forEach(r=>{
            result[r.option_id].count++;
        
    })

    res.json({
        result
    })
  })



  router.post("/task", authMiddleware, async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    const userId = req.userId;
    const body = req.body;
    const parseData = createtaskInput.safeParse(body);

    if (!parseData.success) {
        res.status(400).json({ message: "You've sent the wrong inputs" });
        return;
    }

    try {
        const response = await prismaClient.$transaction(async (tx): Promise<{ id: string }> => {
            const task = await tx.task.create({
                data: {
                    title: parseData.data.title ?? DEFAULT_TITLE,
                    amount: 1* TOTAL_DECIMALS,
                    signature: parseData.data.signature,
                    user_id: userId
                }
            });

            await tx.option.createMany({
                data: parseData.data.options.map(x => ({
                    image_url: x.imageUrl,
                    task_id: task.id
                }))
            });

            return { id: task.id.toString() };
        });

        res.json({ id: response.id });
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
  
router.get("/presignedUrl", authMiddleware, async (req, res) => {
    // @ts-ignore
    const userId = req.userId;

    const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: 'hkirat-cms',
        Key: `fiver/${userId}/${Math.random()}/image.jpg`,
        Conditions: [
          ['content-length-range', 0, 5 * 1024 * 1024] // 5 MB max
        ],
        Expires: 3600
    })

    res.json({
        preSignedUrl: url,
        fields
    })
    
})

// signin with wallet
router.post("/signin", async(req, res)=>{
    const hardCodedWalletAddress = "CtdHux3iiindZ12Mt4ShDNtD2AinQapWMWTbPRbnBDve";
    const existingUser = await prismaClient.user.findFirst({
        where :{
            address : hardCodedWalletAddress
        }
    })

    if(existingUser){
        const token  = jwt.sign({
            userId : existingUser.id
        },JWT_SECRET ) 

        res.json({
            token
        })
    }else{
        const user = await prismaClient.user.create({
            data :{
                address : hardCodedWalletAddress
            }
        }) 

        const token  = jwt.sign({
            userId : user.id
        },JWT_SECRET )

        res.json({
            token
        })
    }
});

export default router;