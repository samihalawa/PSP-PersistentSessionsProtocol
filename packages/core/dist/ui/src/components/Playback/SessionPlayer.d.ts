import React from 'react';
export interface PlaybackEvent {
    type: string;
    timestamp: number;
    target?: string;
    data: Record<string, any>;
}
export interface PlaybackSessionData {
    events: PlaybackEvent[];
    startTime: number;
    duration: number;
}
export interface SessionPlayerProps {
    sessionData: PlaybackSessionData;
    onComplete?: () => void;
    onTimeUpdate?: (currentTime: number) => void;
    initialSpeed?: number;
}
declare const SessionPlayer: React.FC<SessionPlayerProps>;
export default SessionPlayer;
