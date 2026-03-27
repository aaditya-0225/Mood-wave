import { useState, useCallback } from 'react';
import { MoodVisualDisplay, Mood } from './components/MoodVisualDisplay';
import { ConnectionPanel, ConnectionMode } from './components/ConnectionPanel';
import { WearableSimulator } from './components/WearableSimulator';
import { SpotifySimulator } from './components/SpotifySimulator';
import { MoodSelector } from './components/MoodSelector';
import { ProjectorControl } from './components/ProjectorControl';
import { Card } from './components/ui/card';
import { io } from 'socket.io-client';

const MOOD_TO_MODE: Record<Mood, number> = {
  calm: 1,      // Flow
  focused: 2,   // Pulse
  happy: 3,     // Fluid
  energetic: 4, // Grid
  relaxed: 5,   // Zen
};

const socket = io(); // Connects to the same host as the page

export default function App() {
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(null);
  const [currentMood, setCurrentMood] = useState<Mood>('calm');
  const [isPowered, setIsPowered] = useState(false);

  const handleMoodDetected = useCallback((mood: Mood) => {
    setCurrentMood(mood);
    if (isPowered) {
      socket.emit('modeChange', { mode: MOOD_TO_MODE[mood] });
    }
  }, [isPowered]);

  const handleBiometrics = useCallback((data: { hr: number; stress: number }) => {
    if (isPowered) {
      socket.emit('biometrics', data);
    }
  }, [isPowered]);

  const handleMoodSelect = (mood: Mood) => {
    setCurrentMood(mood);
    if (isPowered) {
      socket.emit('modeChange', { mode: MOOD_TO_MODE[mood] });
    }
  };

  const handleModeChange = (mode: ConnectionMode) => {
    setConnectionMode(mode);
    if (mode !== null) {
      setIsPowered(true);
      // Immediately sync current mood when mode starts
      socket.emit('modeChange', { mode: MOOD_TO_MODE[currentMood] });
    }
  };

  const isProjectorActive = isPowered && connectionMode !== null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Mood Wave</h1>
          <p className="text-sm text-gray-500">Ambient Visual Controller</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto p-4 space-y-8">
          {/* Visual Preview */}
          <Card className="overflow-hidden">
            <div className="aspect-video">
              <MoodVisualDisplay mood={currentMood} isActive={isProjectorActive} />
            </div>
          </Card>

          {/* Projector Control */}
          <ProjectorControl
            isConnected={true}
            isPowered={isPowered}
            onTogglePower={() => setIsPowered(!isPowered)}
          />

          {/* Connection Mode Selection */}
          <ConnectionPanel activeMode={connectionMode} onModeChange={handleModeChange} />

          {/* Mode-specific controls */}
          {connectionMode === 'wearable' && (
            <WearableSimulator 
              onMoodDetected={handleMoodDetected} 
              onBiometricsUpdate={handleBiometrics}
            />
          )}

          {connectionMode === 'spotify' && (
            <SpotifySimulator onMoodDetected={handleMoodDetected} />
          )}

          {connectionMode === 'manual' && (
            <MoodSelector selectedMood={currentMood} onMoodSelect={handleMoodSelect} />
          )}

          {/* Info Card */}
          {!connectionMode && isPowered && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-800 text-center">
                👆 Select a connection mode above to start controlling your ambient visuals
              </p>
            </Card>
          )}

          {!isPowered && (
            <Card className="p-4 bg-amber-50 border-amber-200">
              <p className="text-sm text-amber-800 text-center">
                💡 Turn on the projector to begin
              </p>
            </Card>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-md mx-auto">
          <p className="text-xs text-gray-500 text-center">
            {isProjectorActive
              ? `Active: ${connectionMode?.toUpperCase()} mode | Mood: ${currentMood.toUpperCase()}`
              : 'System Standby'}
          </p>
        </div>
      </footer>
    </div>
  );
}
