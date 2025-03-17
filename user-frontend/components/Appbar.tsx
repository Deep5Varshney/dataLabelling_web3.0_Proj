"use client";

import {
    WalletDisconnectButton,
    WalletMultiButton
} from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "@/utils";

export const Appbar = () => {
    const { publicKey, signMessage } = useWallet();

    async function signAndSend() {
        if (!publicKey || !signMessage) {
            console.log("Wallet not connected or signMessage not available.");
            return;
        }

        try {
            const message = new TextEncoder().encode("Sign into mechanical turks");
            const signature = await signMessage(message);

            console.log("Signature:", signature);
            console.log("Public Key:", publicKey.toString());

            const response = await axios.post(`${BACKEND_URL}/v1/user/signin`, {
                signature,
                publicKey: publicKey.toString(),
            });

            localStorage.setItem("token", response.data.token);
        } catch (error) {
            console.error("Error signing in:", error);
        }
    }

    useEffect(() => {
        if (publicKey) {
            signAndSend();
        }
    }, [publicKey]);

    return (
        <div className="flex justify-between border-b pb-2 pt-2">
            <div className="text-2xl pl-4 flex justify-center pt-3">Turkify</div>
            <div className="text-xl pr-4 pb-2">
                {publicKey ? <WalletDisconnectButton /> : <WalletMultiButton />}
            </div>
        </div>
    );
};
