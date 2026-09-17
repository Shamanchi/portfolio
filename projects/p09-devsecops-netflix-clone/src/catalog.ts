export interface CatalogItem {
  id: string;
  title: string;
  genre: string;
  year: number;
  rating: number;
}

export interface CatalogStore {
  list: CatalogItem[];
}

export const SAMPLE_CATALOG: CatalogItem[] = [
  { id: "t-001", title: "Northern Lights", genre: "drama", year: 2022, rating: 4.4 },
  { id: "t-002", title: "Circuit Run", genre: "action", year: 2023, rating: 4.1 },
  { id: "t-003", title: "Paper Moons", genre: "comedy", year: 2021, rating: 3.9 },
  { id: "t-004", title: "Deep Signal", genre: "sci-fi", year: 2024, rating: 4.6 },
];

export function defaultStore(): CatalogStore {
  return { list: SAMPLE_CATALOG.map((item) => ({ ...item })) };
}

export function filterByGenre(store: CatalogStore, genre: string): CatalogItem[] {
  const needle = genre.trim().toLowerCase();
  if (needle === "") {
    return store.list.map((item) => ({ ...item }));
  }
  return store.list
    .filter((item) => item.genre.toLowerCase() === needle)
    .map((item) => ({ ...item }));
}

export function topRated(store: CatalogStore, count: number): CatalogItem[] {
  return [...store.list]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, Math.max(0, count));
}

export function validateItem(item: CatalogItem): string[] {
  const problems: string[] = [];
  if (!item.id.match(/^[a-z0-9][a-z0-9-]{1,31}$/)) {
    problems.push(`id must be a short lowercase slug: ${item.id}`);
  }
  if (item.title.trim().length < 2) {
    problems.push(`title too short: ${item.title}`);
  }
  const genres = new Set(SAMPLE_CATALOG.map((sample) => sample.genre));
  genres.add("documentary");
  if (!genres.has(item.genre)) {
    problems.push(`unknown genre: ${item.genre}`);
  }
  if (item.year < 1900 || item.year > 2100) {
    problems.push(`year out of range: ${item.year}`);
  }
  if (item.rating < 0 || item.rating > 5) {
    problems.push(`rating out of range 0..5: ${item.rating}`);
  }
  return problems;
}