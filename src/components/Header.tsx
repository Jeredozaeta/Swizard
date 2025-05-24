import React, { useState } from 'react';
import { Plus, Minus, Waves, Brain, Headphones, Crown, HelpCircle, Sparkles, Shield, Heart } from 'lucide-react';
import PresetDemo from './PresetDemo';

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ElementType;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What makes Swizard unique?",
    answer: "Swizard combines professional-grade frequency generation with an intuitive interface, letting you create precise soundscapes for meditation, focus, and well-being. Our advanced effects and real-time visualization make sound design accessible to everyone.",
    icon: Sparkles
  },
  {
    question: "How can Swizard benefit my well-being?",
    answer: "Different frequencies influence brainwave patterns in unique ways. Theta waves (4-8 Hz) enhance meditation and creativity, while alpha waves (8-12 Hz) promote relaxation and focus. Swizard lets you target specific frequencies for your desired mental state.",
    icon: Heart
  },
  {
    question: "Is Swizard backed by research?",
    answer: "Yes! Scientific studies show that specific frequencies can influence cognitive performance and emotional states. For example, 432 Hz has been linked to reduced stress levels, while binaural beats can enhance focus and meditation. Visit our Science page for detailed research.",
    icon: Brain
  },
  {
    question: "Can I use Swizard professionally?",
    answer: "Absolutely! Pro users get access to studio-grade effects, HD exports, and commercial licensing. Perfect for meditation guides, content creators, sound healers, and wellness practitioners looking to enhance their practice.",
    icon: Crown
  },
  {
    question: "Is Swizard safe to use?",
    answer: "Safety is our priority. We follow industry standards for frequency ranges and provide clear usage guidelines. Our platform includes built-in volume controls and safety notifications. However, always start at low volumes and consult healthcare professionals if you have specific concerns.",
    icon: Shield
  }
];

const Header: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      <header className="mb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-400 bg-clip-text text-transparent">
            Swizard
          </h1>
        </div>
        <h2 className="text-2xl font-semibold text-violet-200 mb-3">
          Create Powerful Sound Frequencies
        </h2>
        <p className="text-violet-200/80 max-w-2xl mx-auto">
          Design precise frequency-based soundscapes for meditation, focus, and well-being. 
          Perfect for meditation guides, content creators, and wellness practitioners.
        </p>
      </header>

      <PresetDemo />

      <section className="mb-20 py-16 bg-gradient-to-b from-[#1a0b2e]/50 to-transparent">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-3 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Experience the Power of Sound
          </h2>
          <p className="text-center text-violet-200/80 mb-12">
            Start creating transformative sound experiences with professional-grade tools
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