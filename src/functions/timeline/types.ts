
export enum TimelinePointType {
    START = 'START',
    MOST_RECENT = 'MOST_RECENT',
    NEW_ACTIVITY = 'NEW_ACTIVITY',
    TIME_DIFFERENCE = 'TIME_DIFFERENCE',
    EDITED_OUTSIDE_OF_ABE = 'EDITED_OUTSIDE_OF_ABE',
    NONE = ''
}

export interface TimelineSlice{
    startReason: TimelinePointType;
    versions: IGDocVersion[]
}


export interface GQLTimelinePoint{
    type: TimelinePointType;
    versionTime: string;
    version: IGDocVersion;
    intent: string;
    changeSummary: string;
    reverseOutline: string;
    relatedFeedback: string;
}

export interface GQLDocumentTimeline{
    docId: string;
    user: string;
    timelinePoints: GQLTimelinePoint[];
}

export enum Sender {
    USER = "USER",
    SYSTEM = "SYSTEM",
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

  export interface GQLIGDocVersion{
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