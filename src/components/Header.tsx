import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What frequencies should I use for meditation?",
    answer: "Common meditation frequencies include 432 Hz for relaxation, 528 Hz for transformation, and theta waves (4-8 Hz) for deep meditation. Experiment with different frequencies to find what works best for you."
  },
  {
    question: "How do binaural beats work?",
    answer: "Binaural beats occur when slightly different frequencies are played in each ear. Your brain perceives a third tone equal to the difference. For example, 440 Hz in one ear and 444 Hz in the other creates a 4 Hz binaural beat."
  },
  {
    question: "Can I export my custom frequencies?",
    answer: "Yes! Free users can export preview-quality WAV files. Pro users get access to HD WAV exports, MP4 format, and unlimited custom presets."
  },
  {
    question: "What's the science behind sound healing?",
    answer: "Sound frequencies can influence brainwave patterns, affecting mood, focus, and relaxation. Specific frequencies are associated with different states of consciousness and physiological responses."
  },
  {
    question: "How do I create my first sound?",
    answer: "Start by selecting a base frequency, choose a waveform (sine waves are smoothest), then experiment with effects like binaural beats or reverb. Use the 'Create Random Sound' button for inspiration!"
  }
];

const Header: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      <header className="mb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-400 bg-clip-text text-transparent">
            Swizard
          </h1>
        </div>
        <p className="text-violet-200 opacity-90">The real sound wizard</p>
      </header>

      <section className="mb-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-center mb-6 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => (
              <div
                key={index}
                className="bg-[#1a0b2e]/50 rounded-lg border border-purple-500/20 overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleQuestion(index)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-4 hover:bg-purple-500/5 transition-colors"
                >
                  <span className="text-purple-200 font-medium">{item.question}</span>
                  {openIndex === index ? (
                    <ChevronUp className="h-5 w-5 text-purple-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-purple-400 flex-shrink-0" />
                  )}
                </button>
                
                <div
                  className={`px-4 transition-all duration-300 ${
                    openIndex === index ? 'py-3 border-t border-purple-500/20' : 'max-h-0 overflow-hidden'
                  }`}
                >
                  <p className="text-purple-200/80">{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Header;