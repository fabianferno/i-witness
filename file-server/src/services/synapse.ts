import { Synapse } from "@filoz/synapse-sdk";
import { ethers } from "ethers";

// Initialize Synapse SDK
const getSynapse = async () => {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }

  return await Synapse.create({
    privateKey,
    rpcURL: "https://api.calibration.node.glif.io/rpc/v1",
  });
};

export const uploadToStorage = async (
  data: Uint8Array,
  metadata: Record<string, string> = {}
) => {
  const synapse = await getSynapse();

  // Use StorageManager upload directly
  const result = await synapse.storage.upload(data);

  return { pieceCid: result.commp, size: result.size };
};

export const downloadFromStorage = async (pieceCid: string) => {
  const synapse = await getSynapse();
  return await synapse.storage.download(pieceCid);
};

export const checkPaymentSetup = async () => {
  const synapse = await getSynapse();
  const walletBalance = await synapse.payments.balance("USDFC");
  const formattedBalance = ethers.formatUnits(walletBalance, 18);

  return {
    balance: formattedBalance,
    address: await synapse.getSigner().getAddress(),
  };
};

export const setupPayment = async (amountStr: string = "2.5") => {
  const synapse = await getSynapse();
  const depositAmount = ethers.parseUnits(amountStr, 18);

  const walletBalance = await synapse.payments.walletBalance("USDFC");

  if (walletBalance < depositAmount) {
    throw new Error(`Insufficient USDFC balance. Have: ${ethers.formatUnits(walletBalance, 18)}, Need: ${amountStr}`);
  }

  console.log("Depositing & Approving service...");

  const txApprove = await synapse.payments.depositWithPermitAndApproveOperator(
    depositAmount,
    synapse.getWarmStorageAddress(),
    ethers.MaxUint256,
    ethers.MaxUint256,
    ethers.MaxUint256, // maxLockupPeriod
    "USDFC"
  );
  await txApprove.wait();
  console.log("Approval confirmed:", txApprove.hash);

  return {
    txHash: txApprove.hash,
    approvalTxHash: txApprove.hash
  };
};
