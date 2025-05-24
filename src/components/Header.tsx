import React, { useState } from 'react';
import { Plus, Minus, Waves, Brain, Headphones, Crown, HelpCircle, Play, Pause } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

const PRESETS = [
  {
    id: 'deep-calm',
    name: 'Deep Calm',
    description: 'Gentle, grounding bass tones for deep focus',
    frequency: 60,
    waveform: 'sine' as const,
    effects: {
      binaural: { enabled: true, value: 4 },
      amplitudeMod: { enabled: true, value: 0.5 }
    }
  },
  {
    id: 'crystal-clear',
    name: 'Crystal Clear',
    description: 'Bright, sparkling textures for alertness',
    frequency: 4000,
    waveform: 'sine' as const,
    effects: {
      chorus: { enabled: true, value: 2 },
      stereoPan: { enabled: true, value: 30 }
    }
  },
  {
    id: 'balanced-harmony',
    name: 'Balanced Harmony',
    description: 'Natural frequencies for optimal browsing',
    frequency: 432,
    waveform: 'sine' as const,
    effects: {
      tremolo: { enabled: true, value: 1 },
      phaser: { enabled: true, value: 2 }
    }
  }
];

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ElementType;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is Swizard?",
    answer: "Swizard is a professional frequency generator and sound design tool that helps you create custom frequencies for meditation, focus, and relaxation. With our intuitive interface, you can generate precise frequencies, add effects, and export high-quality audio.",
    icon: HelpCircle
  },
  {
    question: "How do sound frequencies impact well-being?",
    answer: "Different frequencies can influence brainwave patterns, affecting mood, focus, and relaxation. For example, alpha waves (8-12 Hz) promote relaxation, while theta waves (4-8 Hz) enhance meditation. Swizard lets you target specific frequencies for desired effects.",
    icon: Waves
  },
  {
    question: "Can I use Swizard for meditation or sleep aid?",
    answer: "Yes! Swizard is perfect for creating meditation and sleep sounds. Use our preset frequencies like 432 Hz for relaxation, or create custom binaural beats. Pro users get access to advanced effects and unlimited exports.",
    icon: Brain
  },
  {
    question: "Is there scientific backing for sound frequency therapy?",
    answer: "Yes, numerous studies support the benefits of specific frequencies. Research shows that binaural beats can affect cognitive performance, while certain frequencies may influence relaxation and focus. Check our Science page for detailed research.",
    icon: Headphones
  },
  {
    question: "Do I need any special equipment to use Swizard?",
    answer: "No special equipment is required. However, using quality headphones can enhance the experience, especially when working with binaural beats. Any modern device with a web browser will work perfectly with Swizard.",
    icon: Crown
  }
];

const Header: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const { state, togglePlayback, updateChannel, updateEffect } = useAudio();

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    if (activePreset === preset.id) {
      togglePlayback();
      setActivePreset(null);
    } else {
      if (state.isPlaying) {
        togglePlayback();
      }
      
      // Update channel settings
      updateChannel(1, {
        frequency: preset.frequency,
        waveform: preset.waveform,
        enabled: true
      });

      // Reset all effects
      Object.keys(state.effects).forEach(effectId => {
        updateEffect(effectId, { enabled: false });
      });

      // Enable preset effects
      Object.entries(preset.effects).forEach(([effectId, settings]) => {
        updateEffect(effectId, settings);
      });

      setTimeout(() => {
        togglePlayback();
        setActivePreset(preset.id);
      }, 100);
    }
  };

  return (
    <>
      <header className="mb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-400 bg-clip-text text-transparent">
            Swizard
          </h1>
        </div>
        <p className="text-violet-200 opacity-90 mb-8">The real sound wizard</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto px-4">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className={`group relative p-6 rounded-lg border transition-all duration-300 ${
                activePreset === preset.id
                  ? 'bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border-violet-500/50 shadow-lg shadow-violet-500/20'
                  : 'bg-[#1a0b2e]/50 border-violet-500/20 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10'
              }`}
            >
              <div className="absolute top-3 right-3">
                {activePreset === preset.id ? (
                  <Pause className="h-5 w-5 text-violet-400" />
                ) : (
                  <Play className="h-5 w-5 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-violet-200 mb-2">{preset.name}</h3>
              <p className="text-sm text-violet-300/70">{preset.description}</p>
              
              <div className="mt-4 text-xs font-mono text-violet-400/60">
                {preset.frequency} Hz • {preset.waveform}
              </div>
            </button>
          ))}
        </div>
      </header>

      <section className="mb-20 py-16 bg-gradient-to-b from-[#1a0b2e]/50 to-transparent">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-3 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Unlock Your Sound Potential
          </h2>
          <p className="text-center text-violet-200/80 mb-12">
            Learn more about how Swizard can enhance your sound experience
          </p>
          
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="bg-[#1a0b2e]/50 rounded-lg border border-purple-500/20 transition-all duration-300"
                >
                  <button
                    onClick={() => toggleQuestion(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-purple-500/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-purple-400" />
                      <span className="text-purple-200 font-medium">{item.question}</span>
                    </div>
                    <div className="flex-shrink-0">
                      {openIndex === index ? (
                        <Minus className="h-5 w-5 text-purple-400" />
                      ) : (
                        <Plus className="h-5 w-5 text-purple-400" />
                      )}
                    </div>
                  </button>
                  
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      openIndex === index 
                        ? 'max-h-96 opacity-100' 
                        : 'max-h-0 opacity-0'
                    } overflow-hidden`}
                  >
                    <div className="px-6 py-4 border-t border-purple-500/20">
                      <p className="text-purple-200/80 leading-relaxed">{item.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default Header;