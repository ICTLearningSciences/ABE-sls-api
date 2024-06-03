import {
  AiServiceFactory,
  AvailableAiServiceNames,
  AvailableAiServices,
} from 'ai_services/ai-service-factory';
import { GQLTimelinePoint } from './types';
import { reverseOutlinePromptRequest } from './reverse-outline';
import {
  numWordsInString,
  numberChangesUsingDiffWords,
  percentageChangeUsingDiffWords,
} from 'helpers';
import { TargetAiModelServiceType } from 'types';

interface Keyframe {
  time: string;
  reverseOutline: string;
}

export const PERCENT_DIFF_THRESHOLD = 20;
export const NUM_WORD_DIFF_THRESHOLD = 100;

export class KeyframeGenerator {
  timelinePoints: GQLTimelinePoint[];
  keyframes: Keyframe[];
  aiService: AvailableAiServices;

  constructor(
    timeLinePoints: GQLTimelinePoint[],
    targetAiService: TargetAiModelServiceType
  ) {
    this.timelinePoints = timeLinePoints;
    this.keyframes = [];
    this.aiService = AiServiceFactory.getAiService(
      targetAiService.serviceName as AvailableAiServiceNames
    );
  }

  textMajorChange(previousText: string, currentText: string) {
    const numWordsCurrent = numWordsInString(currentText);
    if (numWordsCurrent < NUM_WORD_DIFF_THRESHOLD) {
      return false;
    }
    const diffPercentage = percentageChangeUsingDiffWords(
      previousText,
      currentText
    );
    const numWordChanges = numberChangesUsingDiffWords(
      previousText,
      currentText
    );
    return (
      diffPercentage > PERCENT_DIFF_THRESHOLD ||
      numWordChanges > NUM_WORD_DIFF_THRESHOLD
    );
  }

  async generateKeyframe(timelinePoint: GQLTimelinePoint) {
    if (timelinePoint.reverseOutline) {
      this.keyframes.push({
        time: timelinePoint.versionTime,
        reverseOutline: timelinePoint.reverseOutline,
      });
    } else {
      const reverseOutline = await reverseOutlinePromptRequest(
        timelinePoint.version,
        this.aiService
      );
      this.keyframes.push({
        time: timelinePoint.versionTime,
        reverseOutline: reverseOutline,
      });
    }
  }

  /**
   * First keyframe always comes from the first document version that has some content.
   * Subsequent keyframes are generated when there is a major change in the document.
   */
  async generateKeyframes() {
    if (this.timelinePoints.length === 0) {
      return;
    }
    const keyframeGenerationRequest: Promise<void>[] = [];
    let firstOutlineFound = false;
    for (let i = 0; i < this.timelinePoints.length; i++) {
      const timelinePoint = this.timelinePoints[i];
      if (
        !firstOutlineFound &&
        (timelinePoint.reverseOutline || timelinePoint.version.plainText)
      ) {
        firstOutlineFound = true;
        keyframeGenerationRequest.push(this.generateKeyframe(timelinePoint));
        continue;
      }

      if (firstOutlineFound) {
        // now look for any major changes.
        if (i === 0) {
          continue;
        }
        const previousTimelinePoint = this.timelinePoints[i - 1];
        const currentTimelinePoint = this.timelinePoints[i];
        const majorChangesDetected = this.textMajorChange(
          previousTimelinePoint.version.plainText,
          currentTimelinePoint.version.plainText
        );
        if (majorChangesDetected) {
          keyframeGenerationRequest.push(this.generateKeyframe(timelinePoint));
        }
      }
    }
    await Promise.all(keyframeGenerationRequest);
    this.keyframes.sort((a, b) => {
      return a.time.localeCompare(b.time);
    });
  }

  getKeyFrameForTime(time: string) {
    // find the key frame that comes before this timeline point.
    for (let i = this.keyframes.length - 1; i >= 0; i--) {
      if (this.keyframes[i].time <= time) {
        return this.keyframes[i].reverseOutline;
      }
    }
    return '';
  }
}
