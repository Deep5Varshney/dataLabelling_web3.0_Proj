import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "..";
import {Router} from "express";
const router = Router();

const prismaClient = new PrismaClient();
export const WORKER_JWT_SECRET = JWT_SECRET + "worker";



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