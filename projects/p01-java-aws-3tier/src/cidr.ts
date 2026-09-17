export interface ParsedCidr {
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

export function parseCidr(cidr: string): ParsedCidr {
  const match = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/.exec(cidr);
  if (!match) {
    throw new Error(`invalid CIDR notation: ${cidr}`);
  }
  const prefix = Number(match[2]);
  const size = 2 ** (32 - prefix);
  const first = ipToInt(match[1]!) - (ipToInt(match[1]!) % size);
  return { first, prefix, size };
}

export function formatCidr(first: number, prefix: number): string {
  return `${intToIp(first)}/${prefix}`;
}

export interface SubnetAllocation {
  name: string;
  first: number;
  prefix: number;
  size: number;
}

export function allocateSubnets(
  baseCidr: string,
  allocations: Array<{ name: string; prefix: number }>,
): SubnetAllocation[] {
  const base = parseCidr(baseCidr);
  let offset = 0;
  const result: SubnetAllocation[] = [];

  for (const allocation of allocations) {
    if (allocation.prefix < base.prefix || allocation.prefix > 32) {
      throw new Error(`subnet prefix must be between ${base.prefix} and 32`);
    }
    const size = 2 ** (32 - allocation.prefix);
    if (offset + size > base.size) {
      throw new Error(
        `no room for subnet ${allocation.name} inside ${baseCidr}: already used ${offset} of ${base.size}`,
      );
    }
    result.push({
      name: allocation.name,
      first: base.first + offset,
      prefix: allocation.prefix,
      size,
    });
    offset += size;
  }

  return result;
}