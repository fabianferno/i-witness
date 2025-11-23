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
  // Returns { pieceCid, size }
  // pieceCid may be a CID object (multiformats CID with toString method), Uint8Array-like object, or a string
  const result = await synapse.storage.upload(data);

  // Extract CID string from object if needed
  let pieceCidString: string;

  if (typeof result.pieceCid === 'string') {
    // Already a string
    pieceCidString = result.pieceCid;
  } else if (result.pieceCid && typeof result.pieceCid === 'object') {
    const cidObj = result.pieceCid as any;

    // Check if it's a Uint8Array instance
    if (cidObj instanceof Uint8Array) {
      // Import CID from multiformats to convert Uint8Array bytes to CID string
      const { CID } = await import('multiformats/cid');
      const cid = CID.decode(cidObj);
      pieceCidString = cid.toString();
    }
    // Check if it has toString method (CID objects from multiformats have this)
    else if (typeof cidObj.toString === 'function' && cidObj.toString !== Object.prototype.toString) {
      // CID object with toString method
      pieceCidString = cidObj.toString();
    }
    // Check if it's IPLD format: { "/": "..." }
    else if ('/' in cidObj && typeof cidObj['/'] === 'string') {
      pieceCidString = cidObj['/'];
    }
    // Check if it's a Uint8Array-like object (object with numeric keys)
    else if (cidObj.length !== undefined || Object.keys(cidObj).some(k => !isNaN(Number(k)))) {
      // Convert object with numeric keys to Uint8Array
      const bytes: number[] = [];
      const maxKey = Math.max(...Object.keys(cidObj).map(k => Number(k)).filter(k => !isNaN(k)));
      for (let i = 0; i <= maxKey; i++) {
        if (cidObj[i] !== undefined && typeof cidObj[i] === 'number') {
          bytes.push(cidObj[i]);
        }
      }

      // Import CID from multiformats to convert bytes to CID string
      const { CID } = await import('multiformats/cid');
      const cid = CID.decode(new Uint8Array(bytes));
      pieceCidString = cid.toString();
    } else {
      throw new Error(`Unrecognized CID format: ${JSON.stringify(cidObj).substring(0, 100)}`);
    }
  } else {
    throw new Error('Invalid pieceCid format returned from storage.upload()');
  }

  return { pieceCid: pieceCidString, size: result.size };
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
