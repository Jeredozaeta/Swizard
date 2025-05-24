import React, { useState } from 'react';
import { Plus, Minus, Waves, Brain, Headphones, Crown, HelpCircle } from 'lucide-react';

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

      <section className="mb-20 py-16 bg-gradient-to-b from-[#1a0b2e]/50 to-transparent">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-3 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Learn Before You Upgrade
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

          <div className="mt-12 text-center">
            <button 
              onClick={() => window.location.href = '#pricing'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg font-medium text-white hover:from-violet-500 hover:to-fuchsia-500 transition-all duration-300 shadow-lg shadow-purple-500/20"
            >
              <Crown className="h-5 w-5" />
              View Pricing Plans
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Header;