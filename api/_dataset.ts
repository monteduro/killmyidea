// Placeholder for the future public "Kill My Idea" dataset.
// Only called when the user explicitly opts in (`datasetOptIn: true`).
// The UI checkbox is hidden behind DATASET_ENABLED in src/lib/features.ts.
import type { Evaluation } from '../src/lib/types.js'

export async function saveToDataset(_idea: string, _evaluation: Evaluation): Promise<void> {
  // Not implemented in v1: nothing is stored.
}
