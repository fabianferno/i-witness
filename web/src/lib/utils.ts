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
