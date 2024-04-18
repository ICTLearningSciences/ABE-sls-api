/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

export enum TimelinePointType {
  START = 'START',
  MOST_RECENT = 'MOST_RECENT',
  NEW_ACTIVITY = 'NEW_ACTIVITY',
  TIME_DIFFERENCE = 'TIME_DIFFERENCE',
  EDITED_OUTSIDE_OF_ABE = 'EDITED_OUTSIDE_OF_ABE',
  NONE = '',
}

export interface TimelineSlice {
  startReason: TimelinePointType;
  versions: IGDocVersion[];
}

export interface GQLTimelinePoint {
  type: TimelinePointType;
  versionTime: string;
  version: IGDocVersion;
  intent: string;
  changeSummary: string;
  userInputSummary: string;
  reverseOutline: string;
  relatedFeedback: string;
}

export interface GQLDocumentTimeline {
  docId: string;
  user: string;
  timelinePoints: GQLTimelinePoint[];
}

export enum Sender {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}

export interface ChatItem {
  sender: string;
  message: string;
}

export interface IIntention {
  description: string;
  createdAt: string;
}

export interface IGDocVersion {
  docId: string;
  plainText: string;
  lastChangedId: string;
  sessionId: string;
  sessionIntention?: IIntention;
  documentIntention?: IIntention;
  dayIntention?: IIntention;
  chatLog: ChatItem[];
  activity: string;
  intent: string;
  title: string;
  lastModifyingUser: string;
  modifiedTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface GQLIGDocVersion {
  docId: string;
  plainText: string;
  lastChangedId: string;
  chatLog: ChatItem[];
  activity: string;
  intent: string;
  title: string;
  lastModifyingUser: string;
  modifiedTime: string;
}
