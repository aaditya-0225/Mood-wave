import { Card } from './ui/card';
import { Projector, Power } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';

interface ProjectorControlProps {
  isConnected: boolean;
  isPowered: boolean;
  onTogglePower: () => void;
}

export function ProjectorControl({ isConnected, isPowered, onTogglePower }: ProjectorControlProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Projector className="w-5 h-5 text-gray-700" />
          <h3 className="text-sm font-medium text-gray-700">Projector</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'} animate-pulse`} />
          <span className="text-xs text-gray-500">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Power className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">Power</span>
          </div>
          <Switch checked={isPowered} onCheckedChange={onTogglePower} />
        </div>

        {isPowered && (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Brightness</span>
              <span className="text-gray-900">100%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Resolution</span>
              <span className="text-gray-900">1920x1080</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Connection</span>
              <span className="text-gray-900">WiFi</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
