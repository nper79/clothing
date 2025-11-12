import fs from 'fs/promises';
import path from 'path';
import type { ExploreLook } from '../types/explore';

const DATA_PATH = path.resolve(__dirname, 'data', 'exploreDataset.json');

interface ExploreDataset {
  male: ExploreLook[];
  female: ExploreLook[];
}

async function ensureDataFile() {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  try {
    await fs.access(DATA_PATH);
  } catch {
    const empty: ExploreDataset = { male: [], female: [] };
    await fs.writeFile(DATA_PATH, JSON.stringify(empty, null, 2), 'utf-8');
  }
}

export async function readExploreDataset(): Promise<ExploreDataset> {
  await ensureDataFile();
  try {
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(data) as ExploreDataset;
  } catch (error) {
    console.error('[server] Failed to read explore dataset:', error);
    return { male: [], female: [] };
  }
}

export async function writeExploreDataset(dataset: ExploreDataset) {
  await ensureDataFile();
  await fs.writeFile(DATA_PATH, JSON.stringify(dataset, null, 2), 'utf-8');
}
