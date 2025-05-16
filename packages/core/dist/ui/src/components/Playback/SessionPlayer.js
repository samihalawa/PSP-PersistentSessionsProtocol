"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const SessionPlayer = ({ sessionData, onComplete, onTimeUpdate, initialSpeed = 1 }) => {
    // Player state
    const [isPlaying, setIsPlaying] = (0, react_1.useState)(false);
    const [currentTime, setCurrentTime] = (0, react_1.useState)(0);
    const [currentEventIndex, setCurrentEventIndex] = (0, react_1.useState)(-1);
    const [playbackSpeed, setPlaybackSpeed] = (0, react_1.useState)(initialSpeed);
    const [error, setError] = (0, react_1.useState)(null);
    // Refs
    const playerRef = (0, react_1.useRef)(null);
    const timerRef = (0, react_1.useRef)(null);
    // Calculate duration in seconds
    const durationSeconds = sessionData.duration / 1000;
    // Sort events by timestamp
    const sortedEvents = [...sessionData.events].sort((a, b) => a.timestamp - b.timestamp);
    // Format time as MM:SS
    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    // Calculate progress (0-100)
    const progress = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0;
    // Start playback
    const startPlayback = () => {
        if (sortedEvents.length === 0) {
            setError('No events to play');
            return;
        }
        setIsPlaying(true);
        // If at the end, start from beginning
        if (currentTime >= durationSeconds) {
            setCurrentTime(0);
            setCurrentEventIndex(-1);
        }
        // Start timer
        const startTime = Date.now() - (currentTime * 1000);
        // Clear any existing timer
        if (timerRef.current) {
            cancelAnimationFrame(timerRef.current);
        }
        // Animation frame based timer for smoother playback
        const updateTimer = () => {
            const elapsed = (Date.now() - startTime) * playbackSpeed;
            const newTime = elapsed / 1000;
            // Don't exceed duration
            if (newTime >= durationSeconds) {
                setCurrentTime(durationSeconds);
                setIsPlaying(false);
                if (onComplete) {
                    onComplete();
                }
                return;
            }
            setCurrentTime(newTime);
            // Find current event
            const timeMs = newTime * 1000;
            let newIndex = -1;
            // Find the last event that occurred before or at the current time
            for (let i = 0; i < sortedEvents.length; i++) {
                if (sortedEvents[i].timestamp <= timeMs) {
                    newIndex = i;
                }
                else {
                    // We've found the first event after the current time
                    break;
                }
            }
            // Update current event index if changed
            if (newIndex !== currentEventIndex) {
                setCurrentEventIndex(newIndex);
                // Process the event
                if (newIndex >= 0) {
                    processEvent(sortedEvents[newIndex]);
                }
            }
            // Call onTimeUpdate callback
            if (onTimeUpdate) {
                onTimeUpdate(newTime);
            }
            // Continue timer
            timerRef.current = requestAnimationFrame(updateTimer);
        };
        // Start update loop
        timerRef.current = requestAnimationFrame(updateTimer);
    };
    // Pause playback
    const pausePlayback = () => {
        setIsPlaying(false);
        // Clear timer
        if (timerRef.current) {
            cancelAnimationFrame(timerRef.current);
            timerRef.current = null;
        }
    };
    // Stop playback
    const stopPlayback = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setCurrentEventIndex(-1);
        // Clear timer
        if (timerRef.current) {
            cancelAnimationFrame(timerRef.current);
            timerRef.current = null;
        }
    };
    // Restart playback
    const restartPlayback = () => {
        stopPlayback();
        setTimeout(() => startPlayback(), 0);
    };
    // Process an event (visual feedback of what's happening)
    const processEvent = (event) => {
        console.log('Processing event:', event);
        // In a real implementation, this would either:
        // 1. Show a visual representation of the event in the player
        // 2. Communicate with an iframe to replay the event
        // 3. Use a backend bridge to execute the event in a browser
        // For now, we'll just create a visual indication
        if (playerRef.current) {
            // Create an element to show the event
            const eventElement = document.createElement('div');
            eventElement.className = 'playback-event';
            eventElement.style.position = 'absolute';
            eventElement.style.padding = '4px 8px';
            eventElement.style.borderRadius = '4px';
            eventElement.style.backgroundColor = 'rgba(0, 102, 204, 0.7)';
            eventElement.style.color = 'white';
            eventElement.style.zIndex = '1000';
            eventElement.style.transition = 'opacity 0.5s';
            // Position randomly in the player
            const playerRect = playerRef.current.getBoundingClientRect();
            const left = Math.random() * (playerRect.width - 100);
            const top = Math.random() * (playerRect.height - 50);
            eventElement.style.left = `${left}px`;
            eventElement.style.top = `${top}px`;
            // Set content based on event type
            switch (event.type) {
                case 'click':
                    eventElement.textContent = `Click: ${event.target || 'unknown'}`;
                    eventElement.style.backgroundColor = 'rgba(220, 0, 78, 0.7)';
                    break;
                case 'input':
                    eventElement.textContent = `Input: ${event.data.value || ''}`;
                    eventElement.style.backgroundColor = 'rgba(76, 175, 80, 0.7)';
                    break;
                case 'navigation':
                    eventElement.textContent = `Navigate: ${event.data.url || ''}`;
                    eventElement.style.backgroundColor = 'rgba(121, 85, 72, 0.7)';
                    break;
                default:
                    eventElement.textContent = `${event.type}: ${event.target || 'unknown'}`;
            }
            // Add to player
            playerRef.current.appendChild(eventElement);
            // Remove after a delay
            setTimeout(() => {
                eventElement.style.opacity = '0';
                setTimeout(() => eventElement.remove(), 500);
            }, 1500);
        }
    };
    // Handle slider change
    const handleSliderChange = (event, newValue) => {
        const newTime = typeof newValue === 'number' ? newValue : newValue[0];
        // Pause if playing
        if (isPlaying) {
            pausePlayback();
        }
        // Update time
        setCurrentTime(newTime);
        // Find current event based on new time
        const timeMs = newTime * 1000;
        let newIndex = -1;
        for (let i = 0; i < sortedEvents.length; i++) {
            if (sortedEvents[i].timestamp <= timeMs) {
                newIndex = i;
            }
            else {
                break;
            }
        }
        setCurrentEventIndex(newIndex);
    };
    // Skip to previous event
    const skipToPrevious = () => {
        if (currentEventIndex > 0) {
            const newIndex = currentEventIndex - 1;
            const newTime = sortedEvents[newIndex].timestamp / 1000;
            setCurrentEventIndex(newIndex);
            setCurrentTime(newTime);
            // Process the event
            processEvent(sortedEvents[newIndex]);
        }
    };
    // Skip to next event
    const skipToNext = () => {
        if (currentEventIndex < sortedEvents.length - 1) {
            const newIndex = currentEventIndex + 1;
            const newTime = sortedEvents[newIndex].timestamp / 1000;
            setCurrentEventIndex(newIndex);
            setCurrentTime(newTime);
            // Process the event
            processEvent(sortedEvents[newIndex]);
        }
    };
    // Change playback speed
    const handleSpeedChange = () => {
        // Cycle through speeds: 0.5, 1, 1.5, 2
        const speeds = [0.5, 1, 1.5, 2];
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextIndex = (currentIndex + 1) % speeds.length;
        setPlaybackSpeed(speeds[nextIndex]);
    };
    // Clean up on unmount
    (0, react_1.useEffect)(() => {
        return () => {
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
        };
    }, []);
    return (<material_1.Card>
      <material_1.CardContent>
        <material_1.Typography variant="h6" gutterBottom>
          Session Playback
          {playbackSpeed !== 1 && (<material_1.Typography component="span" variant="body2" color="textSecondary" sx={{ ml: 1 }}>
              ({playbackSpeed}x)
            </material_1.Typography>)}
        </material_1.Typography>
        
        {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </material_1.Alert>)}
        
        <material_1.Box ref={playerRef} sx={{
            position: 'relative',
            backgroundColor: 'rgba(0, 0, 0, 0.03)',
            borderRadius: 1,
            height: 300,
            mb: 2,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
          {sortedEvents.length === 0 ? (<material_1.Typography color="textSecondary">
              No events to play
            </material_1.Typography>) : (<>
              {!isPlaying && currentEventIndex === -1 && (<material_1.Button variant="contained" startIcon={<icons_material_1.PlayArrow />} onClick={startPlayback}>
                  Start Playback
                </material_1.Button>)}
              
              {currentEventIndex >= 0 && (<material_1.Box sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                    right: 16,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: 1,
                    borderRadius: 1
                }}>
                  <material_1.Typography variant="body2">
                    {currentEventIndex >= 0 && (<>
                        Event {currentEventIndex + 1} of {sortedEvents.length}:&nbsp;
                        {sortedEvents[currentEventIndex].type}
                        {sortedEvents[currentEventIndex].target && (<> on {sortedEvents[currentEventIndex].target}</>)}
                      </>)}
                  </material_1.Typography>
                </material_1.Box>)}
            </>)}
        </material_1.Box>
        
        <material_1.Box sx={{ mb: 2 }}>
          <material_1.Grid container spacing={2} alignItems="center">
            <material_1.Grid item xs>
              <material_1.Slider value={currentTime} max={durationSeconds} onChange={handleSliderChange} aria-labelledby="playback-slider" disabled={sortedEvents.length === 0} sx={{ mr: 2 }}/>
            </material_1.Grid>
            <material_1.Grid item>
              <material_1.Typography variant="body2" color="textSecondary">
                {formatTime(currentTime)} / {formatTime(durationSeconds)}
              </material_1.Typography>
            </material_1.Grid>
          </material_1.Grid>
        </material_1.Box>
        
        <material_1.Stack direction="row" spacing={1} justifyContent="center">
          <material_1.IconButton onClick={skipToPrevious} disabled={currentEventIndex <= 0 || isPlaying || sortedEvents.length === 0} title="Previous Event">
            <icons_material_1.SkipPrevious />
          </material_1.IconButton>
          
          {isPlaying ? (<material_1.IconButton onClick={pausePlayback} disabled={sortedEvents.length === 0} title="Pause">
              <icons_material_1.Pause />
            </material_1.IconButton>) : (<material_1.IconButton onClick={startPlayback} disabled={sortedEvents.length === 0 || currentTime >= durationSeconds} title="Play">
              <icons_material_1.PlayArrow />
            </material_1.IconButton>)}
          
          <material_1.IconButton onClick={stopPlayback} disabled={!isPlaying && currentTime === 0 || sortedEvents.length === 0} title="Stop">
            <icons_material_1.Stop />
          </material_1.IconButton>
          
          <material_1.IconButton onClick={skipToNext} disabled={currentEventIndex >= sortedEvents.length - 1 || isPlaying || sortedEvents.length === 0} title="Next Event">
            <icons_material_1.SkipNext />
          </material_1.IconButton>
          
          <material_1.IconButton onClick={handleSpeedChange} disabled={sortedEvents.length === 0} title="Change Speed">
            <icons_material_1.Speed />
          </material_1.IconButton>
          
          <material_1.IconButton onClick={restartPlayback} disabled={sortedEvents.length === 0} title="Restart">
            <icons_material_1.Replay />
          </material_1.IconButton>
        </material_1.Stack>
        
        <material_1.Box sx={{ mt: 2 }}>
          <material_1.Typography variant="subtitle2" gutterBottom>
            Event Timeline
          </material_1.Typography>
          
          <material_1.Box sx={{ position: 'relative', height: 20, backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: 1 }}>
            {/* Progress bar */}
            <material_1.Box sx={{
            position: 'absolute',
            height: '100%',
            width: `${progress}%`,
            backgroundColor: 'primary.main',
            borderRadius: 1
        }}/>
            
            {/* Event markers */}
            {sortedEvents.map((event, index) => {
            const position = (event.timestamp / (sessionData.duration || 1)) * 100;
            return (<material_1.Box key={index} sx={{
                    position: 'absolute',
                    height: '100%',
                    width: 2,
                    left: `${position}%`,
                    backgroundColor: index === currentEventIndex ? 'secondary.main' : 'rgba(0, 0, 0, 0.3)',
                    zIndex: index === currentEventIndex ? 2 : 1
                }} title={`${event.type} at ${formatTime(event.timestamp / 1000)}`}/>);
        })}
          </material_1.Box>
        </material_1.Box>
      </material_1.CardContent>
    </material_1.Card>);
};
exports.default = SessionPlayer;
