import { AiGenerationStatus, GQLTimelinePoint, TimelinePointType } from "../../../../src/timeline-generation/types";

interface GQLTimelinePointRequest{
    versionTime: string;
    type: TimelinePointType;
    plainText: string;
    reverseOutline?: string
}

export const gqlTimelinePointGenerator = (timelinePoints: GQLTimelinePointRequest[]): GQLTimelinePoint[] => {
    return timelinePoints.map((timelinePoint) => {
        return {
            type: timelinePoint.type,
            versionTime: timelinePoint.versionTime,
            version: {
                docId: '123',
                plainText: timelinePoint.plainText,
                lastChangedId: '',
                sessionId: '',
                chatLog: [],
                activity: '',
                intent: '',
                title: "",
                lastModifyingUser: "",
                modifiedTime: timelinePoint.versionTime,
                createdAt: timelinePoint.versionTime,
                updatedAt: timelinePoint.versionTime
            },
            reverseOutlineStatus: timelinePoint.reverseOutline ? AiGenerationStatus.COMPLETED : AiGenerationStatus.NONE,
            changeSummaryStatus: AiGenerationStatus.COMPLETED,
            changeSummary: '',
            reverseOutline: timelinePoint.reverseOutline || '',
            userInputSummary: '',
            relatedFeedback: '',
            intent: '',
        };
    
    })
}