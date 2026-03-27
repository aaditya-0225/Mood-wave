import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Music, Play } from 'lucide-react';
import { Mood } from './MoodVisualDisplay';

interface SpotifySimulatorProps {
  onMoodDetected: (mood: Mood) => void;
}

const mockTracks = [
  { name: 'Weightless', artist: 'Marconi Union', tempo: 60, mood: 'calm' as Mood },
  { name: 'Blinding Lights', artist: 'The Weeknd', tempo: 171, mood: 'energetic' as Mood },
  { name: 'Lofi Study', artist: 'ChillHop', tempo: 85, mood: 'focused' as Mood },
  { name: 'Good 4 U', artist: 'Olivia Rodrigo', tempo: 164, mood: 'happy' as Mood },
  { name: 'Ambient Dream', artist: 'Spa Music', tempo: 70, mood: 'relaxed' as Mood },
];

export function SpotifySimulator({ onMoodDetected }: SpotifySimulatorProps) {
  const [currentTrack, setCurrentTrack] = useState(mockTracks[0]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate track changes
    const trackInterval = setInterval(() => {
      const randomTrack = mockTracks[Math.floor(Math.random() * mockTracks.length)];
      setCurrentTrack(randomTrack);
      setProgress(0);
      onMoodDetected(randomTrack.mood);
    }, 15000);

    // Simulate playback progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 150);

    return () => {
      clearInterval(trackInterval);
      clearInterval(progressInterval);
    };
  }, [onMoodDetected]);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Music className="w-5 h-5 text-green-600" />
        <h3 className="text-sm font-medium text-gray-700">Now Playing</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Play className="w-8 h-8 text-white" fill="white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{currentTrack.name}</p>
            <p className="text-sm text-gray-500 truncate">{currentTrack.artist}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-green-600 h-1 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500">Tempo</p>
            <p className="text-sm font-semibold text-gray-900">{currentTrack.tempo} BPM</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Detected Mood</p>
            <p className="text-sm font-semibold text-gray-900 capitalize">{currentTrack.mood}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
