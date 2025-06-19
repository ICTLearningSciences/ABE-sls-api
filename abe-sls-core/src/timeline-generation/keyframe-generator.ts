/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import {
  AiServiceFactory,
  AvailableAiServiceNames,
  AvailableAiServices,
} from '../ai_services/ai-service-factory.js';
import { GQLTimelinePoint } from './types.js';
import { reverseOutlinePromptRequest } from './reverse-outline.js';
import {
  numWordsInString,
  numberChangesUsingDiffWords,
  percentageChangeUsingDiffWords,
} from '../helpers.js';
import { TargetAiModelServiceType } from '../types.js';
import { AiServiceModelConfigs } from '../gql_types.js';

export interface ReverseOutlineKeyframe {
  time: string;
  reverseOutline: string;
}

export const PERCENT_DIFF_THRESHOLD = 20;
export const NUM_WORD_DIFF_THRESHOLD = 100;

export class KeyframeGenerator {
  timelinePoints: GQLTimelinePoint[];
  keyframes: ReverseOutlineKeyframe[];
  aiService: AvailableAiServices;

  constructor(
    timeLinePoints: GQLTimelinePoint[],
    targetAiService: TargetAiModelServiceType,
    llmModelConfigs: AiServiceModelConfigs[]
  ) {
    this.timelinePoints = timeLinePoints;
    this.keyframes = [];
    this.aiService = AiServiceFactory.getAiService(
      targetAiService.serviceName as AvailableAiServiceNames,
      llmModelConfigs
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
      try {
        const reverseOutline = await reverseOutlinePromptRequest(
          timelinePoint.version,
          this.aiService
        );
        this.keyframes.push({
          time: timelinePoint.versionTime,
          reverseOutline: reverseOutline,
        });
      } catch (error) {
        console.error(
          'Error generating reverse outline for version',
          timelinePoint.version._id,
          error
        );
      }
    }
  }
  /**
   * Generates keyframes in positions where there is a major change in the document.
   *
   * Will re-use reverse outlines if they are already present in the timeline points.
   *
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
        return this.keyframes[i];
      }
    }
    return undefined;
  }
}
