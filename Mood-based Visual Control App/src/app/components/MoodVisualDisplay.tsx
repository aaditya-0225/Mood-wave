import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

export type Mood = 'calm' | 'energetic' | 'focused' | 'happy' | 'relaxed';

interface MoodVisualDisplayProps {
  mood: Mood;
  isActive: boolean;
}

const moodConfigs = {
  calm: {
    colors: ['#667eea', '#764ba2', '#4338ca'],
    name: 'Calm',
    speed: 15,
    particleCount: 8,
  },
  energetic: {
    colors: ['#ff6b6b', '#ee5a6f', '#f06543'],
    name: 'Energetic',
    speed: 3,
    particleCount: 20,
  },
  focused: {
    colors: ['#06b6d4', '#14b8a6', '#10b981'],
    name: 'Focused',
    speed: 8,
    particleCount: 12,
  },
  happy: {
    colors: ['#fbbf24', '#f59e0b', '#fb923c'],
    name: 'Happy',
    speed: 5,
    particleCount: 15,
  },
  relaxed: {
    colors: ['#a78bfa', '#8b5cf6', '#7c3aed'],
    name: 'Relaxed',
    speed: 12,
    particleCount: 10,
  },
};

export function MoodVisualDisplay({ mood, isActive }: MoodVisualDisplayProps) {
  const config = moodConfigs[mood];
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: config.particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 60 + 40,
    }));
    setParticles(newParticles);
  }, [mood, config.particleCount]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Background gradient */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${config.colors[0]}, ${config.colors[1]}, ${config.colors[2]})`,
        }}
        animate={{
          opacity: isActive ? [0.6, 0.8, 0.6] : 0.3,
        }}
        transition={{
          duration: config.speed,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Animated particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            background: `radial-gradient(circle, ${config.colors[particle.id % config.colors.length]}99, transparent)`,
          }}
          animate={
            isActive
              ? {
                  x: [0, Math.random() * 100 - 50, 0],
                  y: [0, Math.random() * 100 - 50, 0],
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.7, 0.4],
                }
              : { opacity: 0.2 }
          }
          transition={{
            duration: config.speed,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: particle.id * 0.2,
          }}
        />
      ))}

      {/* Mood label */}
      {isActive && (
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <motion.div
            className="inline-block px-6 py-3 rounded-full bg-black/40 backdrop-blur-sm"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <p className="text-white text-2xl font-semibold">{config.name}</p>
          </motion.div>
        </div>
      )}

      {/* Status indicator */}
      {!isActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/60 text-center">
          <p className="text-lg">Projector Standby</p>
          <p className="text-sm mt-2">Select a connection mode to activate</p>
        </div>
      )}
    </div>
  );
}
