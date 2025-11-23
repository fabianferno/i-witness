import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { verifyMessage } from "ethers"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function pythonifyWitnessData(data: any): string {
  const floatPaths = new Set([
    'depthData.min',
    'depthData.max',
    'depthData.mean',
    'depthData.std'
  ]);
  const floatArrays = new Set([
    'depthData.values'
  ]);

  function stringify(obj: any, path: string = ''): string {
    if (obj === null) return 'null';
    if (obj === undefined) return 'null';

    if (typeof obj === 'number') {
      // Check if it needs to be a float (if it's an integer but should be float)
      const isFloatPath = floatPaths.has(path);

      if (Number.isInteger(obj) && isFloatPath) {
        return `${obj}.0`;
      }
      return JSON.stringify(obj);
    }

    if (typeof obj === 'boolean') {
      return JSON.stringify(obj);
    }

    if (typeof obj === 'string') {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      const isFloatArray = floatArrays.has(path);
      const items = obj.map(item => {
        if (typeof item === 'number' && Number.isInteger(item) && isFloatArray) {
          return `${item}.0`;
        }
        // For arrays, we don't extend the path for items to avoid complexity, 
        // unless we need to support nested objects in arrays which we don't for this schema
        return stringify(item, path);
      });
      return '[' + items.join(',') + ']';
    }

    if (typeof obj === 'object') {
      const sortedKeys = Object.keys(obj).sort();
      const parts = sortedKeys.map(key => {
        const newPath = path ? `${path}.${key}` : key;
        return `${JSON.stringify(key)}:${stringify(obj[key], newPath)}`;
      });
      return '{' + parts.join(',') + '}';
    }

    return JSON.stringify(obj);
  }

  return stringify(data);
}

export function verifySignature(data: unknown, signature: string): string | null {
  try {
    // Use the Python-compatible stringifier
    const message = pythonifyWitnessData(data);

    // Ensure signature has 0x prefix
    const formattedSignature = signature.startsWith('0x') ? signature : `0x${signature}`;
    const recoveredAddress = verifyMessage(message, formattedSignature);
    return recoveredAddress;
  } catch (error) {
    console.error("Signature verification failed:", error);
    return null;
  }
}

export async function addMetadataToPng(imageBlob: Blob, key: string, value: string): Promise<Blob> {
  const buffer = await imageBlob.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // Verify signature
  for (let i = 0; i < 8; i++) {
    if (uint8Array[i] !== signature[i]) {
      throw new Error("Invalid PNG signature");
    }
  }

  // Create tEXt chunk
  // Keyword + null separator + Text
  const encoder = new TextEncoder();
  const keywordBytes = encoder.encode(key);
  const textBytes = encoder.encode(value);
  const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
  chunkData.set(keywordBytes, 0);
  chunkData[keywordBytes.length] = 0; // Null separator
  chunkData.set(textBytes, keywordBytes.length + 1);

  const chunkLength = chunkData.length;
  const chunkType = encoder.encode("tEXt");

  // Calculate CRC (Cyclic Redundancy Check)
  // CRC is calculated on Chunk Type and Chunk Data
  const crcInput = new Uint8Array(chunkType.length + chunkData.length);
  crcInput.set(chunkType, 0);
  crcInput.set(chunkData, chunkType.length);

  const crc = crc32(crcInput);

  // Construct the new chunk: Length (4) + Type (4) + Data (length) + CRC (4)
  const newChunk = new Uint8Array(4 + 4 + chunkLength + 4);
  const view = new DataView(newChunk.buffer);

  view.setUint32(0, chunkLength, false); // Big-endian length
  newChunk.set(chunkType, 4);
  newChunk.set(chunkData, 8);
  view.setUint32(8 + chunkLength, crc, false); // Big-endian CRC

  // Insert chunk after IHDR (usually the first chunk)
  // Find end of IHDR
  let offset = 8; // Skip signature
  while (offset < uint8Array.length) {
    const view = new DataView(uint8Array.buffer);
    const length = view.getUint32(offset, false);
    const type = new TextDecoder().decode(uint8Array.slice(offset + 4, offset + 8));

    offset += 8 + length + 4; // Move to next chunk

    if (type === "IHDR") {
      break;
    }
  }

  // Combine parts
  const newBuffer = new Uint8Array(uint8Array.length + newChunk.length);
  newBuffer.set(uint8Array.slice(0, offset), 0);
  newBuffer.set(newChunk, offset);
  newBuffer.set(uint8Array.slice(offset), offset + newChunk.length);

  return new Blob([newBuffer], { type: "image/png" });
}

// CRC32 implementation
function crc32(buf: Uint8Array): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return crc ^ 0xFFFFFFFF;
}
