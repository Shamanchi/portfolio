export interface Cidr {
  address: number;
  prefix: number;
}

const OCTETS = 4;
const BITS = 32;

export function parseCidr(value: string): Cidr | null {
  const parts = value.trim().split("/");
  if (parts.length !== 2) return null;
  const prefix = Number(parts[1]);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > BITS) return null;
  const octets = parts[0]?.split(".") ?? [];
  if (octets.length !== OCTETS) return null;
  let address = 0;
  for (const octetRaw of octets) {
    const octet = Number(octetRaw);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    address = (address << 8) | octet;
  }
  return { address, prefix };
}

function mask(prefix: number): number {
  if (prefix === 0) return 0;
  return ~((1 << (BITS - prefix)) - 1) >>> 0;
}

export function networkAddress(cidr: Cidr): number {
  return (cidr.address & mask(cidr.prefix)) >>> 0;
}

export function endAddress(cidr: Cidr): number {
  return (networkAddress(cidr) + 2 ** (BITS - cidr.prefix) - 1) >>> 0;
}

export function contains(parent: Cidr, child: Cidr): boolean {
  if (child.prefix < parent.prefix) return false;
  const parentStart = networkAddress(parent);
  const childStart = networkAddress(child);
  const parentEnd = endAddress(parent);
  const childEnd = endAddress(child);
  return childStart >= parentStart && childEnd <= parentEnd;
}

export function overlaps(a: Cidr, b: Cidr): boolean {
  return endAddress(a) > networkAddress(b) && endAddress(b) > networkAddress(a);
}

export function isValidCidr(value: string): boolean {
  return parseCidr(value) !== null;
}