import { Synapse } from "@filoz/synapse-sdk";

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

export const downloadFromStorage = async (pieceCid: string): Promise<Uint8Array> => {
  const synapse = await getSynapse();
  return await synapse.storage.download(pieceCid);
};

