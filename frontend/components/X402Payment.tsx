"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useX402Payment } from "@/hooks/useX402Payment";
import { getContractAddresses } from "@/lib/contracts";

interface X402PaymentProps {
  priceUsd: number;
  agentId: number;
  onPaymentComplete: (paymentHash: string) => void;
  onError: (error: string) => void;
}

export function X402Payment({
  priceUsd,
  agentId,
  onPaymentComplete,
  onError,
}: X402PaymentProps) {
  const { address, isConnected } = useAccount();
  const { requestPayment, signPayment, buildPaymentPayload } = useX402Payment();
  const [paying, setPaying] = useState(false);

  const handlePayment = async () => {
    if (!isConnected || !address) {
      onError("Please connect your wallet first");
      return;
    }

    setPaying(true);

    try {
      // CRITICAL: Clear any old payment before creating a new one
      // This ensures we never reuse an old payment hash
      if (typeof window !== "undefined") {
        const oldPayment = sessionStorage.getItem(`payment_${agentId}`);
        if (oldPayment) {
          console.log("Clearing old payment before creating new one");
          sessionStorage.removeItem(`payment_${agentId}`);
        }
      }

      const { agentEscrow } = getContractAddresses();
      if (agentEscrow === "0x...") {
        onError("Contract not deployed. Please set AGENT_ESCROW_ADDRESS");
        return;
      }

      console.log("💰 Payment Details:", {
        agentEscrow,
        envVar: process.env.NEXT_PUBLIC_AGENT_ESCROW_ADDRESS,
        agentId,
        priceUsd,
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const resourceUrl = `${apiUrl}/api/agents/${agentId}/execute`;

      console.log("Creating NEW payment - this will generate a unique nonce and hash");

      // Step 1: Request payment requirements from backend
      const paymentRequest = await requestPayment(
        priceUsd,
        agentEscrow,
        resourceUrl
      );

      // Step 2: Sign payment with wallet (generates fresh random nonce each time)
      const { signature, nonce, validAfter, validBefore } = await signPayment(paymentRequest);

      // Step 3: Build payment payload using the SAME nonce and timestamps from signing
      const { header: paymentHeader, hash: paymentHash } = await buildPaymentPayload(
        paymentRequest,
        signature,
        nonce,
        validAfter,
        validBefore
      );

      console.log("New payment created with hash:", paymentHash);

      // Store payment header for submission to backend
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`payment_${agentId}`, paymentHeader);
      }

      onPaymentComplete(paymentHash);
    } catch (error: any) {
      if (error.code === 4001) {
        onError("Transaction rejected by user");
      } else {
        onError(error.message || "Payment failed");
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-lg border border-neutral-700 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-neutral-50 mb-1">x402 Micropayment</h3>
            <p className="text-sm text-neutral-400">Pay per execution with instant settlement</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-500">${priceUsd.toFixed(2)}</div>
            <div className="text-xs text-neutral-500">USDC</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400 mb-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Instant</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Secure</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>On-chain</span>
          </div>
        </div>
        <button
          onClick={handlePayment}
          disabled={paying || !isConnected}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-neutral-800 disabled:to-neutral-800 disabled:opacity-50 text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-green-500/20 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
        >
          {paying ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing Payment...</span>
            </>
          ) : (
            <>
              <span>Pay ${priceUsd.toFixed(2)} USDC</span>
              <span className="text-xs opacity-75">via x402</span>
            </>
          )}
        </button>
      </div>
      {!isConnected && (
        <p className="text-sm text-neutral-500 text-center">
          Connect your wallet to proceed with payment
        </p>
      )}
    </div>
  );
}
