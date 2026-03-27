import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Activity, Heart } from 'lucide-react';
import { Mood } from './MoodVisualDisplay';

interface WearableSimulatorProps {
  onMoodDetected: (mood: Mood) => void;
  onBiometricsUpdate?: (data: { hr: number; stress: number }) => void;
}

export function WearableSimulator({ onMoodDetected, onBiometricsUpdate }: WearableSimulatorProps) {
  const [heartRate, setHeartRate] = useState(72);
  const [stress, setStress] = useState(30);

  useEffect(() => {
    // Simulate changing biometric data
    const interval = setInterval(() => {
      const baseHR = 60 + Math.random() * 40;
      const variation = Math.sin(Date.now() / 5000) * 10;
      const newHR = Math.round(baseHR + variation);
      setHeartRate(newHR);

      const newStress = Math.round(20 + Math.random() * 60);
      setStress(newStress);

      // Detect mood based on biometrics
      let detectedMood: Mood;
      if (newHR < 65 && newStress < 35) {
        detectedMood = 'relaxed';
      } else if (newHR < 70 && newStress < 45) {
        detectedMood = 'calm';
      } else if (newHR > 85 && newStress > 60) {
        detectedMood = 'energetic';
      } else if (newHR > 75 && newStress < 50) {
        detectedMood = 'happy';
      } else {
        detectedMood = 'focused';
      }

      onMoodDetected(detectedMood);
      if (onBiometricsUpdate) {
        onBiometricsUpdate({ hr: newHR, stress: newStress });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [onMoodDetected]);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-700">Wearable Data</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-sm text-gray-600">Heart Rate</span>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{heartRate}</p>
            <p className="text-xs text-gray-500">bpm</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Stress Level</span>
            <span className="text-sm font-medium text-gray-900">{stress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stress}%` }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Analyzing biometric data...
          </p>
        </div>
      </div>
    </Card>
  );
}
