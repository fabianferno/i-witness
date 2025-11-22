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

  // Create storage service (selects provider automatically)
  // We can pass metadata here if supported, but SDK 0.20.1 createStorage options 
  // don't seem to have metadata field directly in StorageServiceOptions 
  // (it has callbacks, providerId, etc).
  // Create storage service (selects provider automatically)
  const storage = await synapse.createStorage();

  const result = await storage.upload(data);

  return { pieceCid: result.commp, size: result.size };
};

export const downloadFromStorage = async (pieceCid: string) => {
  const synapse = await getSynapse();
  return await synapse.download(pieceCid);
};

export const checkPaymentSetup = async () => {
  const synapse = await getSynapse();
  const walletBalance = await synapse.payments.walletBalance("USDFC");
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

  console.log("Depositing...");
  const tx = await synapse.payments.deposit(depositAmount, "USDFC");
  await tx.wait();
  console.log("Deposit confirmed:", tx.hash);

  console.log("Approving service...");
  const storageInfo = await synapse.getStorageInfo();
  const serviceAddress = storageInfo.serviceParameters.pandoraAddress;

  const txApprove = await synapse.payments.approveService(
    serviceAddress,
    ethers.MaxUint256,
    ethers.MaxUint256,
    "USDFC"
  );
  await txApprove.wait();
  console.log("Approval confirmed:", txApprove.hash);

  return {
    txHash: tx.hash,
    approvalTxHash: txApprove.hash
  };
};
