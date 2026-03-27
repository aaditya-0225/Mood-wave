import { Watch, Music, Hand } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

export type ConnectionMode = 'wearable' | 'spotify' | 'manual' | null;

interface ConnectionPanelProps {
  activeMode: ConnectionMode;
  onModeChange: (mode: ConnectionMode) => void;
}

export function ConnectionPanel({ activeMode, onModeChange }: ConnectionPanelProps) {
  const modes = [
    {
      id: 'wearable' as const,
      name: 'Wearable',
      icon: Watch,
      description: 'Heart rate & biometrics',
    },
    {
      id: 'spotify' as const,
      name: 'Spotify',
      icon: Music,
      description: 'Music tempo detection',
    },
    {
      id: 'manual' as const,
      name: 'Manual',
      icon: Hand,
      description: 'Full control',
    },
  ];

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-3 text-gray-700">Connection Mode</h3>
      <div className="space-y-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;

          return (
            <Button
              key={mode.id}
              variant={isActive ? 'default' : 'outline'}
              className="w-full justify-start h-auto py-3"
              onClick={() => onModeChange(isActive ? null : mode.id)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">{mode.name}</p>
                  <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                    {mode.description}
                  </p>
                </div>
                {isActive && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs">Active</span>
                  </div>
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
