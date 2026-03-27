import { Card } from './ui/card';
import { Button } from './ui/button';
import { Mood } from './MoodVisualDisplay';
import { Waves, Zap, Target, Smile, Sparkles } from 'lucide-react';

interface MoodSelectorProps {
  selectedMood: Mood;
  onMoodSelect: (mood: Mood) => void;
}

const moodOptions = [
  { id: 'calm' as Mood, name: 'Calm', icon: Waves, color: 'bg-indigo-500' },
  { id: 'energetic' as Mood, name: 'Energetic', icon: Zap, color: 'bg-red-500' },
  { id: 'focused' as Mood, name: 'Focused', icon: Target, color: 'bg-cyan-500' },
  { id: 'happy' as Mood, name: 'Happy', icon: Smile, color: 'bg-amber-500' },
  { id: 'relaxed' as Mood, name: 'Relaxed', icon: Sparkles, color: 'bg-purple-500' },
];

export function MoodSelector({ selectedMood, onMoodSelect }: MoodSelectorProps) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-3 text-gray-700">Select Mood</h3>
      <div className="grid grid-cols-2 gap-2">
        {moodOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedMood === option.id;

          return (
            <Button
              key={option.id}
              variant={isSelected ? 'default' : 'outline'}
              className={`h-auto py-4 flex flex-col gap-2 ${
                isSelected ? option.color : ''
              }`}
              onClick={() => onMoodSelect(option.id)}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-medium">{option.name}</span>
            </Button>
          );
        })}
      </div>

      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          Tap a mood to instantly change your ambient visuals
        </p>
      </div>
    </Card>
  );
}
