export function normalizeImageUrls(values: readonly (string | null | undefined)[] | null | undefined): string[] {
  const result: string[] = [];
  for (const value of values ?? []) {
    const trimmed = value?.trim();
    if (trimmed && !result.includes(trimmed)) result.push(trimmed);
  }
  return result;
}

export function getRecordImageUrls(record: { image_urls?: string[] | null; image_url?: string | null }): string[] {
  const urls = normalizeImageUrls(record.image_urls);
  return urls.length > 0 ? urls : normalizeImageUrls([record.image_url]);
}

export function findInvalidImageUrl(values: readonly string[]): string | undefined {
  return values.map((value) => value.trim()).find((value) => value && !/^https?:\/\//i.test(value));
}
