import fs from 'fs';
import path from 'path';
import { PullRequestPayload } from '@proof/shared';

export class SampleStore {
  private samples: Map<string, PullRequestPayload> = new Map();

  constructor() {
    this.loadSamples();
  }

  private loadSamples(): void {
    const samplesDir = path.resolve(__dirname, '../../../samples');
    const filenames = ['genuine-pr.json', 'needs-work-pr.json', 'likely-spam-pr.json'];

    for (const file of filenames) {
      const fullPath = path.join(samplesDir, file);
      if (fs.existsSync(fullPath)) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const data = JSON.parse(raw) as PullRequestPayload;
          this.samples.set(data.id, data);
        } catch (err) {
          console.error(`Failed to load sample file ${file}:`, err);
        }
      }
    }
  }

  getAllSamples(): PullRequestPayload[] {
    return Array.from(this.samples.values());
  }

  getSampleById(id: string): PullRequestPayload | undefined {
    return this.samples.get(id);
  }
}

export const defaultSampleStore = new SampleStore();
