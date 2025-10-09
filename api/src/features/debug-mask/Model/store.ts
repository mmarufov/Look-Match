const masks = new Map<string, { width: number; height: number; mask: Uint8Array }>();

export function storeMask(id: string, width: number, height: number, mask: Uint8Array) {
  masks.set(id, { width, height, mask });
}

export function getMask(id: string) {
  return masks.get(id);
}


