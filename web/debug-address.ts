import { getAddress } from "viem";

const NAME_WRAPPER = "0x0635513f179D50A207757E05759CbD106d726894";
const PUBLIC_RESOLVER = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD";

console.log("NameWrapper:", getAddress(NAME_WRAPPER));
console.log("PublicResolver:", getAddress(PUBLIC_RESOLVER));
