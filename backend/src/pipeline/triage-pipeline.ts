/**
 * Pipeline entrypoint delegating to ReviewEngine for triage orchestration.
 * Preserves Person 1's interface (defaultTriagePipeline.triage).
 */
export {
  ReviewEngine,
  TriagePipeline,
  defaultReviewEngine,
  defaultTriagePipeline,
} from '../engine/review-engine';
