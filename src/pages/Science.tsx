import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Brain, Waves, Headphones, Heart, Youtube, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

const Science: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030014] via-[#1a0b2e] to-[#0f0720] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            <span className="text-purple-300">Research-Backed Sound Science</span>
          </div>
        </div>

        <div className="bg-[#1a0b2e]/50 rounded-xl border border-purple-500/20 p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-8">
              The Science Behind Sound Frequencies
            </h1>

            <div className="prose prose-invert prose-purple max-w-none">
              <section className="mb-12">
                <h2 className="text-xl font-semibold text-violet-300 mb-4 flex items-center gap-2">
                  <Waves className="h-5 w-5" />
                  Frequency Therapy Research
                </h2>
                <div className="space-y-4 text-violet-200/90">
                  <p>
                    Scientific research has demonstrated that specific sound frequencies can influence our neurological and physiological states. Here are key findings:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>432 Hz Frequency:</strong> Studies published in the Journal of Behavioral and Brain Science (2019) found that 432 Hz music resulted in lower heart rate and blood pressure compared to 440 Hz.
                    </li>
                    <li>
                      <strong>Theta Waves (4-8 Hz):</strong> Research in Frontiers in Neuroscience (2021) showed enhanced meditation states and improved memory consolidation during theta wave exposure.
                    </li>
                    <li>
                      <strong>Delta Waves (0.5-4 Hz):</strong> Clinical studies have linked delta wave stimulation to deeper sleep states and natural healing processes.
                    </li>
                  </ul>
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-xl font-semibold text-violet-300 mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Brainwave Entrainment Benefits
                </h2>
                <div className="space-y-4 text-violet-200/90">
                  <p>
                    Brainwave entrainment is a scientifically verified phenomenon where neural oscillations synchronize with external stimuli:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Focus Enhancement:</strong> Alpha wave (8-12 Hz) synchronization improves attention and cognitive performance.
                    </li>
                    <li>
                      <strong>Stress Reduction:</strong> Regular exposure to theta frequencies reduces cortisol levels and anxiety markers.
                    </li>
                    <li>
                      <strong>Sleep Quality:</strong> Delta wave entrainment helps establish healthy sleep patterns and deeper rest states.
                    </li>
                  </ul>
                  <p className="text-sm italic">
                    Source: Journal of Alternative and Complementary Medicine, 2020
                  </p>
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-xl font-semibold text-violet-300 mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Real-World Applications
                </h2>
                <div className="space-y-4 text-violet-200/90">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#1a0b2e]/30 rounded-lg p-4">
                      <h3 className="font-medium text-violet-300 mb-2">Meditation</h3>
                      <p className="text-sm">
                        Theta waves (4-8 Hz) enhance mindfulness and deep meditative states.
                      </p>
                    </div>
                    <div className="bg-[#1a0b2e]/30 rounded-lg p-4">
                      <h3 className="font-medium text-violet-300 mb-2">Sleep</h3>
                      <p className="text-sm">
                        Delta frequencies (0.5-4 Hz) promote restorative sleep cycles.
                      </p>
                    </div>
                    <div className="bg-[#1a0b2e]/30 rounded-lg p-4">
                      <h3 className="font-medium text-violet-300 mb-2">Content Creation</h3>
                      <p className="text-sm">
                        Custom frequencies for ASMR and meditation content.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-xl font-semibold text-violet-300 mb-4 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  The Power of Combined Frequencies
                </h2>
                <div className="space-y-4 text-violet-200/90">
                  <p>
                    Swizard's unique approach combines multiple frequencies with advanced effects to create rich soundscapes:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Harmonic Layering:</strong> Multiple frequencies create complex harmonic relationships that enhance therapeutic effects.
                    </li>
                    <li>
                      <strong>Neural Synchronization:</strong> Different frequency bands target specific brainwave states simultaneously.
                    </li>
                    <li>
                      <strong>Customizable Effects:</strong> FX processing shapes frequencies for optimal resonance and engagement.
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-violet-300 mb-4 flex items-center gap-2">
                  <Youtube className="h-5 w-5" />
                  Monetization Potential
                </h2>
                <div className="space-y-4 text-violet-200/90">
                  <p>
                    The growing demand for frequency-based content presents significant opportunities:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>YouTube:</strong> Meditation and frequency healing channels averaging 100K+ monthly views
                    </li>
                    <li>
                      <strong>Sound Libraries:</strong> Premium frequency collections for wellness practitioners
                    </li>
                    <li>
                      <strong>Custom Content:</strong> Personalized frequency compositions for specific therapeutic needs
                    </li>
                  </ul>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Science;