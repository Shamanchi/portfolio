export interface CidrBlock {
  first: number;
  prefix: number;
  size: number;
}

export function ipToInt(ip: string): number {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    throw new Error(`invalid IPv4 address: ${ip}`);
  }
  return ((parts[0]! << 24) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!) >>> 0;
}

export function intToIp(value: number): string {
  const v = value >>> 0;
  return [24, 16, 8, 0].map((shift) => (v >>> shift) & 255).join(".");
}

export function parseCidr(cidr: string): CidrBlock {
  const match = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/.exec(cidr);
  if (!match) {
    throw new Error(`invalid CIDR notation: ${cidr}`);
  }
  const prefix = Number(match[2]);
  const size = 2 ** (32 - prefix);
  const raw = ipToInt(match[1]!);
  return { first: raw - (raw % size), prefix, size };
}

export function formatCidr(first: number, prefix: number): string {
  return `${intToIp(first)}/${prefix}`;
}

export interface BlockRequest {
  name: string;
  prefix: number;
}

export interface AllocatedBlock extends BlockRequest {
  first: number;
  size: number;
}

export function allocateBlocks(baseCidr: string, blocks: BlockRequest[]): AllocatedBlock[] {
  const base = parseCidr(baseCidr);
  let offset = 0;
  const result: AllocatedBlock[] = [];

  for (const block of blocks) {
    if (block.prefix < base.prefix || block.prefix > 32) {
      throw new Error(`prefix of ${block.name} must be between ${base.prefix} and 32`);
    }
    const size = 2 ** (32 - block.prefix);
    if (offset + size > base.size) {
      throw new Error(
        `no room for ${block.name} inside ${baseCidr}: used ${offset} of ${base.size} addresses`,
      );
    }
    result.push({
      name: block.name,
      prefix: block.prefix,
      first: base.first + offset,
      size,
    });
    offset += size;
  }

  return result;
}