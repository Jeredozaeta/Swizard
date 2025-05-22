import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Link as ScrollLink } from 'react-scroll';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import * as Tone from 'tone';
import { useStripe } from '../context/StripeContext';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { toast } from 'react-toastify';
import { Wand2, Crown, Play, X, Sliders, ToggleLeft, FileDown, Check, ArrowRight, Lock, Shield, CreditCard, Sparkles, Zap, Music, Download, Share2, Palette, Brain, Rocket, Star, Headphones, AudioWaveform as Waveform, Settings, ChevronDown, Info, Radiation as Meditation, Heart, Youtube, Lightbulb, HelpCircle, Waves, Headphones as HeadphonesIcon, BrainCircuit, Stethoscope, Plus, Minus, Moon, Focus, Music2, Coffee, Film, Sparkles as SparklesIcon, Radiation as MeditationIcon, PlayCircle, RefreshCw } from 'lucide-react';

const presets = [
  {
    id: 'deep-sleep',
    name: 'Delta Drift',
    description: 'Soft 60 Hz sawtooth pads',
    frequencies: '60 Hz L + 64 Hz R → 4 Hz beat',
    icon: Moon,
    leftFreq: 60,
    rightFreq: 64,
    waveform: 'sawtooth' as const
  },
  {
    id: 'calm-focus',
    name: 'Alpha Flow',
    description: 'Gentle 200 Hz sine hum',
    frequencies: '200 Hz L + 208 Hz R → 8 Hz beat',
    icon: Focus,
    leftFreq: 200,
    rightFreq: 208,
    waveform: 'sine' as const
  },
  {
    id: 'pure-tone',
    name: '432 Hz Classic',
    description: 'Single 432 Hz sine',
    frequencies: 'No modulation',
    icon: Music2,
    leftFreq: 432,
    rightFreq: 432,
    waveform: 'sine' as const
  }
];

const proFeatures = {
  creativity: [
    { icon: Music, text: '14+ studio-grade effects' },
    { icon: Waveform, text: 'Real-time waveform sculpting' },
    { icon: Palette, text: 'Unlimited custom presets' }
  ],
  control: [
    { icon: Sliders, text: 'Advanced parameter control' },
    { icon: Headphones, text: 'Enhanced audio fidelity' },
    { icon: Settings, text: 'Customizable effect chains' }
  ],
  monetization: [
    { icon: Download, text: 'HD WAV + MP4 export' },
    { icon: Share2, text: 'Commercial use license' },
    { icon: CreditCard, text: 'Priority support' }
  ]
};

const faqs = [
  {
    question: 'What is Swizard?',
    answer: 'Swizard is a web-based platform that allows users to create, customize, and export sound frequencies for various purposes, including relaxation, focus, and content creation.',
    icon: HelpCircle
  },
  {
    question: 'How do sound frequencies impact well-being?',
    answer: 'Research indicates that specific sound frequencies can influence brainwave activity, promoting states of relaxation, focus, and even aiding in pain management. For instance, frequencies like 432 Hz are associated with calming effects.',
    icon: Waves
  },
  {
    question: 'Can I use Swizard for meditation or sleep aid?',
    answer: 'Absolutely. Swizard offers tools to generate frequencies known to support meditation practices and improve sleep quality by inducing theta and delta brainwave states.',
    icon: BrainCircuit
  },
  {
    question: 'Is there scientific backing for sound frequency therapy?',
    answer: 'Yes. Studies have shown that sound therapy can reduce stress, alleviate anxiety, and even assist in physical healing processes.',
    icon: Stethoscope
  },
  {
    question: 'Do I need any special equipment to use Swizard?',
    answer: 'No special equipment is required. However, using quality headphones can enhance the experience, especially when working with binaural beats.',
    icon: HeadphonesIcon
  }
];

const useCases = [
  {
    id: 'meditation',
    name: 'Deep Meditation',
    description: 'Theta waves for mindfulness',
    icon: MeditationIcon,
    frequencies: [
      { freq: 6, type: 'sine' },
      { freq: 432, type: 'sine' }
    ],
    effects: ['binaural', 'reverb'],
    exportType: 'WAV + MP3'
  },
  {
    id: 'focus',
    name: 'Flow State',
    description: 'Alpha boost for productivity',
    icon: BrainCircuit,
    frequencies: [
      { freq: 10, type: 'triangle' },
      { freq: 40, type: 'sine' }
    ],
    effects: ['phaser', 'pan'],
    exportType: 'WAV'
  },
  {
    id: 'sleep',
    name: 'Sleep Aid',
    description: 'Delta waves for rest',
    icon: Moon,
    frequencies: [
      { freq: 2, type: 'sine' },
      { freq: 60, type: 'sine' }
    ],
    effects: ['lowpass', 'reverb'],
    exportType: 'MP3 Loop'
  },
  {
    id: 'content',
    name: 'Content Creation',
    description: 'ASMR & background tones',
    icon: Film,
    frequencies: [
      { freq: 432, type: 'sine' },
      { freq: 528, type: 'triangle' }
    ],
    effects: ['chorus', 'delay'],
    exportType: 'HD WAV'
  }
];

const Landing: React.FC = () => {
  const { createCheckoutSession } = useStripe();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPlaying432Hz, setIsPlaying432Hz] = useState(false);
  const [isPlayingBinaural, setIsPlayingBinaural] = useState(false);
  const [showMoreFeatures, setShowMoreFeatures] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<{
    name: string;
    price: string;
    period: string;
    features: string[];
  } | null>(null);
  const oscillatorRef = useRef<Tone.Oscillator | null>(null);
  const binauralOscLeftRef = useRef<Tone.Oscillator | null>(null);
  const binauralOscRightRef = useRef<Tone.Oscillator | null>(null);
  const binauralPanLeftRef = useRef<Tone.Panner | null>(null);
  const binauralPanRightRef = useRef<Tone.Panner | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const binauralCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const binauralAnimationFrameRef = useRef<number>();
  const binauralTimerRef = useRef<number>();
  const [featuresRef, featuresInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  const [pricingRef, pricingInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  const [demoRef, demoInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  const [faqRef, faqInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const animationFrames = useRef<Record<string, number>>({});

  const drawWaveform = (
    preset: typeof presets[0],
    canvas: HTMLCanvasElement,
    timestamp: number
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(15, 7, 32, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawWave = (freq: number, color: string, pan: number = 0) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      const amplitude = canvas.height / 4;
      const period = canvas.width / (freq / 10);

      for (let x = 0; x < canvas.width; x++) {
        const t = x / period + timestamp / 1000;
        let y;

        switch (preset.waveform) {
          case 'sawtooth':
            y = ((t % 1) * 2 - 1) * amplitude;
            break;
          case 'square':
            y = Math.sign(Math.sin(2 * Math.PI * t)) * amplitude;
            break;
          default: // sine
            y = Math.sin(2 * Math.PI * t) * amplitude;
        }

        // Apply panning effect
        y *= Math.cos((x / canvas.width - 0.5 + pan * 0.5) * Math.PI);

        y += canvas.height / 2;
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    // Draw left and right channels
    if (preset.leftFreq === preset.rightFreq) {
      // Single frequency mode
      drawWave(preset.leftFreq, 'rgba(139, 92, 246, 0.4)');
    } else {
      // Binaural mode
      drawWave(preset.leftFreq, 'rgba(139, 92, 246, 0.4)', -1);
      drawWave(preset.rightFreq, 'rgba(236, 72, 153, 0.4)', 1);
    }
  };

  useEffect(() => {
    // Clean up function to cancel all animations
    return () => {
      Object.values(animationFrames.current).forEach(frame => {
        cancelAnimationFrame(frame);
      });
    };
  }, []);

  const startWaveformAnimation = (presetId: string) => {
    const canvas = canvasRefs.current[presetId];
    if (!canvas) return;

    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    const animate = (timestamp: number) => {
      drawWaveform(preset, canvas, timestamp);
      animationFrames.current[presetId] = requestAnimationFrame(animate);
    };

    animationFrames.current[presetId] = requestAnimationFrame(animate);
  };

  const stopWaveformAnimation = (presetId: string) => {
    if (animationFrames.current[presetId]) {
      cancelAnimationFrame(animationFrames.current[presetId]);
      delete animationFrames.current[presetId];

      const canvas = canvasRefs.current[presetId];
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgb(15, 7, 32)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  };

  const playPreset = async (presetId: string) => {
    if (isPlaying) {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.dispose();
      }
      if (binauralOscLeftRef.current) {
        binauralOscLeftRef.current.stop();
        binauralOscRightRef.current?.stop();
        binauralOscLeftRef.current.dispose();
        binauralOscRightRef.current?.dispose();
      }
      stopWaveformAnimation(presetId);
      setIsPlaying(false);
      setActivePreset(null);
      return;
    }

    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    try {
      await Tone.start();
      
      if (preset.leftFreq === preset.rightFreq) {
        // Single frequency mode
        oscillatorRef.current = new Tone.Oscillator({
          frequency: preset.leftFreq,
          type: preset.waveform
        }).toDestination();
        oscillatorRef.current.volume.value = -20;
        oscillatorRef.current.start();
      } else {
        // Binaural beat mode
        binauralOscLeftRef.current = new Tone.Oscillator({
          frequency: preset.leftFreq,
          type: preset.waveform
        });
        binauralOscRightRef.current = new Tone.Oscillator({
          frequency: preset.rightFreq,
          type: preset.waveform
        });
        
        binauralPanLeftRef.current = new Tone.Panner(-1);
        binauralPanRightRef.current = new Tone.Panner(1);

        binauralOscLeftRef.current.connect(binauralPanLeftRef.current);
        binauralOscRightRef.current.connect(binauralPanRightRef.current);
        binauralPanLeftRef.current.toDestination();
        binauralPanRightRef.current.toDestination();

        binauralOscLeftRef.current.volume.value = -20;
        binauralOscRightRef.current.volume.value = -20;

        binauralOscLeftRef.current.start();
        binauralOscRightRef.current.start();
      }

      startWaveformAnimation(presetId);
      setIsPlaying(true);
      setActivePreset(presetId);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (isPlaying) {
          playPreset(presetId);
        }
      }, 30000);
    } catch (error) {
      console.error('Audio playback error:', error);
      toast.error('Failed to start audio playback');
    }
  };

  const handleCheckout = async (priceId: string) => {
    try {
      const planDetails = {
        [STRIPE_PRODUCTS.monthly.priceId]: {
          name: 'Pro Monthly',
          price: '$22',
          period: 'month',
          features: [
            '14+ studio-grade effects',
            'Real-time waveform sculpting',
            'HD WAV + MP4 export',
            'Unlimited custom presets',
            'Commercial use license'
          ]
        },
        [STRIPE_PRODUCTS.yearly.priceId]: {
          name: 'Pro 6-Month',
          price: '$88',
          period: '6 months',
          features: [
            'Everything in Monthly plan',
            'Early access to AI features',
            'Priority feature unlocks',
            'Premium preset templates',
            '33% savings'
          ]
        }
      };

      setSelectedPlanDetails(planDetails[priceId]);
      setShowConfirmModal(true);
      setSelectedPlan(priceId);

      setTimeout(() => {
        document.getElementById('checkout-modal')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout process');
    }
  };

  const handleCheckoutProcess = async (priceId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await createCheckoutSession(priceId);
      
      if (error) {
        console.error('Checkout error:', error);
        toast.error('Failed to start checkout. Please try again.');
        return;
      }

      if (!data?.url) {
        console.error('Missing checkout URL');
        toast.error('Invalid checkout response');
        return;
      }

      window.open(data.url, '_blank', 'noopener,noreferrer');
      
      toast.info('Checkout opened in a new tab. Complete your purchase to unlock Pro features!', {
        autoClose: 10000
      });
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const toggle432Hz = async () => {
    if (!isPlaying432Hz) {
      await Tone.start();
      oscillatorRef.current = new Tone.Oscillator(432, 'sine').toDestination();
      oscillatorRef.current.volume.value = -20;
      oscillatorRef.current.start();

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const animate = () => {
            if (!canvasRef.current || !ctx) return;
            
            ctx.fillStyle = 'rgb(15, 7, 32)';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
            ctx.lineWidth = 2;
            
            const now = Date.now() / 1000;
            const frequency = 432;
            const amplitude = canvasRef.current.height / 4;
            
            for (let x = 0; x < canvasRef.current.width; x++) {
              const t = x / canvasRef.current.width;
              const y = amplitude * Math.sin(2 * Math.PI * frequency * (t + now)) + canvasRef.current.height / 2;
              
              if (x === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            
            ctx.stroke();
            animationFrameRef.current = requestAnimationFrame(animate);
          };
          
          animate();
        }
      }
    } else {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.dispose();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }
    setIsPlaying432Hz(!isPlaying432Hz);
  };

  const toggleBinaural = async () => {
    if (!isPlayingBinaural) {
      await Tone.start();
      
      binauralOscLeftRef.current = new Tone.Oscillator(432, 'sine');
      binauralOscRightRef.current = new Tone.Oscillator(440, 'sine');
      binauralPanLeftRef.current = new Tone.Panner(-1);
      binauralPanRightRef.current = new Tone.Panner(1);

      binauralOscLeftRef.current.connect(binauralPanLeftRef.current);
      binauralOscRightRef.current.connect(binauralPanRightRef.current);
      binauralPanLeftRef.current.toDestination();
      binauralPanRightRef.current.toDestination();

      binauralOscLeftRef.current.volume.value = -20;
      binauralOscRightRef.current.volume.value = -20;

      binauralOscLeftRef.current.start();
      binauralOscRightRef.current.start();

      if (binauralCanvasRef.current) {
        const ctx = binauralCanvasRef.current.getContext('2d');
        if (ctx) {
          const animate = () => {
            if (!binauralCanvasRef.current || !ctx) return;
            
            ctx.fillStyle = 'rgba(15, 7, 32, 0.1)';
            ctx.fillRect(0, 0, binauralCanvasRef.current.width, binauralCanvasRef.current.height);
            
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
            ctx.lineWidth = 2;
            
            const now = Date.now() / 1000;
            const amplitude = binauralCanvasRef.current.height / 4;
            
            // Draw left channel
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
            for (let x = 0; x < binauralCanvasRef.current.width; x++) {
              const t = x / binauralCanvasRef.current.width;
              const y = amplitude * Math.sin(2 * Math.PI * 432 * (t + now)) + binauralCanvasRef.current.height / 2;
              
              if (x === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.stroke();

            // Draw right channel
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
            for (let x = 0; x < binauralCanvasRef.current.width; x++) {
              const t = x / binauralCanvasRef.current.width;
              const y = amplitude * Math.sin(2 * Math.PI * 440 * (t + now)) + binauralCanvasRef.current.height / 2;
              
              if (x === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.stroke();
            
            binauralAnimationFrameRef.current = requestAnimationFrame(animate);
          };
          
          animate();
        }
      }

      // Auto-stop after 10 seconds
      binauralTimerRef.current = window.setTimeout(() => {
        if (isPlayingBinaural) {
          toggleBinaural();
        }
      }, 10000);
    } else {
      if (binauralOscLeftRef.current) {
        binauralOscLeftRef.current.stop();
        binauralOscLeftRef.current.dispose();
      }
      if (binauralOscRightRef.current) {
        binauralOscRightRef.current.stop();
        binauralOscRightRef.current.dispose();
      }
      if (binauralPanLeftRef.current) {
        binauralPanLeftRef.current.dispose();
      }
      if (binauralPanRightRef.current) {
        binauralPanRightRef.current.dispose();
      }
      if (binauralAnimationFrameRef.current) {
        cancelAnimationFrame(binauralAnimationFrameRef.current);
      }
      if (binauralTimerRef.current) {
        clearTimeout(binauralTimerRef.current);
      }
      if (binauralCanvasRef.current) {
        const ctx = binauralCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, binauralCanvasRef.current.width, binauralCanvasRef.current.height);
        }
      }
    }
    setIsPlayingBinaural(!isPlayingBinaural);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030014] via-[#1a0b2e] to-[#0f0720]">
      {/* Hero Section */}
      <section className="min-h-[80vh] flex items-center justify-center px-4 py-8 relative overflow-hidden">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-radial from-violet-500/5 via-transparent to-transparent" />
        
        <div className="text-center max-w-4xl mx-auto relative z-10">
          {/* Brand logo */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center gap-3">
              <Waves className="h-8 w-8 text-purple-400 float-animation" />
              <h2 className="brand-font text-2xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent glow-animation">
                SWIZARD
              </h2>
            </div>
          </motion.div>

          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="brand-font text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent glow-animation block">
                Design Sound Frequencies
              </span>
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent glow-animation block mt-2">
                Never Heard Before
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-violet-200/90 max-w-3xl mx-auto leading-relaxed">
              Shape consciousness with layered frequencies, 14+ studio effects, and
              <br className="hidden sm:block" />
              infinite sound combinations. Export HD files ready for any platform.
            </p>
          </motion.div>

          {/* Primary CTAs */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <Link 
              to="/app" 
              className="btn btn-primary btn-lg group w-full sm:w-auto px-8 py-4 text-lg bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-violet-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-300"
            >
              <SparklesIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
              Start Your First Sound
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            <ScrollLink
              to="pricing"
              smooth={true}
              duration={500}
              className="btn btn-secondary btn-lg w-full sm:w-auto px-8 py-4 text-lg cursor-pointer backdrop-blur-sm group hover:bg-violet-500/20 transition-all duration-300"
            >
              <Crown className="h-5 w-5 group-hover:scale-110 transition-transform" />
              Unlock Pro Tools
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </ScrollLink>
          </motion.div>

          {/* Interactive Demo Section */}
          <motion.div
            ref={demoRef}
            className="bg-[#1a0b2e]/30 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={demoInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h3 className="text-xl font-semibold text-purple-300 mb-6 text-center">Try These Presets</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {presets.map(preset => {
                const Icon = preset.icon;
                const isActive = activePreset === preset.id;
                
                return (
                  <div
                    key={preset.id}
                    className={`bg-[#1a0b2e]/50 rounded-lg border transition-all duration-300 ${
                      isActive 
                        ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' 
                        : 'border-purple-500/20 hover:border-purple-500/30'
                    } p-4`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className={`h-5 w-5 ${isActive ? 'text-purple-400' : 'text-purple-400/70'}`} />
                      <h4 className="font-medium text-purple-200">{preset.name}</h4>
                    </div>
                    
                    <p className="text-sm text-purple-300/70 mb-2">{preset.description}</p>
                    <p className="text-xs font-mono text-purple-300/50 mb-4">{preset.frequencies}</p>
                    
                    <div className="h-16 bg-[#0f0720]/50 rounded-lg border border-purple-500/20 overflow-hidden mb-4">
                      <canvas
                        ref={el => canvasRefs.current[preset.id] = el}
                        width={256}
                        height={64}
                        className="w-full h-full"
                      />
                    </div>
                    
                    <button
                      onClick={() => playPreset(preset.id)}
                
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-purple-600/30 text-purple-200'
                          : 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/25'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <X className="h-4 w-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Play
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-sm text-purple-300/70">
              <HeadphonesIcon className="inline-block h-4 w-4 mr-1" />
              Use headphones for best experience • Samples limited to 30 seconds
            </p>
          </motion.div>

          {/* Learn More Link */}
          <ScrollLink
            to="features"
            smooth={true}
            duration={500}
            className="inline-flex items-center gap-2 text-violet-300/70 hover:text-violet-300 transition-colors cursor-pointer"
          >
            <Info className="h-4 w-4" />
            <span>Learn how it works</span>
            <ChevronDown className="h-4 w-4" />
          </ScrollLink>
        </div>
      </section>

      {/* Features Section */}
      <section 
        id="features"
        ref={featuresRef}
        className="py-12 px-4 bg-[#1a0b2e]/20"
      >
        <motion.div
          className="max-w-5xl mx-auto text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={featuresInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Professional Sound Control
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#1a0b2e]/50 backdrop-blur-sm rounded-lg border border-purple-500/20">
              <Sliders className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-purple-300 mb-2">Real-time sliders</h3>
              <p className="text-purple-200/70 text-sm">Fine-tune your frequencies with precision controls</p>
            </div>

            <div className="p-4 bg-[#1a0b2e]/50 backdrop-blur-sm rounded-lg border border-purple-500/20">
              <ToggleLeft className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-purple-300 mb-2">14 FX toggles</h3>
              <p className="text-purple-200/70 text-sm">Shape your sound with professional effects</p>
            </div>

            <div className="p-4 bg-[#1a0b2e]/50 backdrop-blur-sm rounded-lg border border-purple-500/20 sm:col-span-2 md:col-span-1">
              <FileDown className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-purple-300 mb-2">HD export</h3>
              <p className="text-purple-200/70 text-sm">Download studio-quality WAV files</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Sound in Action Section */}
      <section className="py-16 px-4 bg-[#1a0b2e]/20">
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={demoInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Sound in Action
            </h2>
            <p className="text-violet-200/80 text-lg">
              Explore real-world applications and start creating instantly
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              
              return (
                <div
                  key={useCase.id}
                  className="group bg-[#1a0b2e]/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="h-6 w-6 text-purple-400" />
                    <h3 className="text-lg font-semibold text-purple-300">
                      {useCase.name}
                    </h3>
                  </div>

                  <p className="text-sm text-purple-200/70 mb-4">
                    {useCase.description}
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="text-xs font-mono text-purple-300/50">
                      Frequencies:
                      {useCase.frequencies.map((f, i) => (
                        <span key={i} className="ml-1">
                          {f.freq}Hz ({f.type})
                          {i < useCase.frequencies.length - 1 ? ' + ' : ''}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {useCase.effects.map((effect) => (
                        <span
                          key={effect}
                          className="px-2 py-1 bg-purple-500/10 rounded-full text-xs text-purple-300/70"
                        >
                          {effect}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="h-16 bg-[#0f0720]/50 rounded-lg border border-purple-500/20 overflow-hidden mb-4 group-hover:border-purple-500/30 transition-all duration-300">
                    <canvas
                      ref={el => canvasRefs.current[useCase.id] = el}
                      width={256}
                      height={64}
                      className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-300/50">
                      Export: {useCase.exportType}
                    </span>
                    <Link
                      to="/app"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg text-sm text-purple-300 transition-colors group-hover:shadow-sm group-hover:shadow-purple-500/20"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Try Now
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg font-medium text-white transition-all duration-300 hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-violet-500/30 group"
            >
              <SparklesIcon className="h-5 w-5" />
              Start Creating Your Own
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FAQ Section */}
      <section 
        id="faq" 
        ref={faqRef}
        className="py-12 px-4 bg-[#1a0b2e]/20"
      >
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={faqInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Learn Before You Upgrade
            </h2>
            <p className="text-violet-200/80 text-lg">
              Learn more about how Swizard can enhance your sound experience
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const Icon = faq.icon;
              const isOpen = openFaqIndex === index;

              return (
                <div
                  key={index}
                  className={`bg-[#1a0b2e]/50 backdrop-blur-sm rounded-lg border transition-all duration-300 ${
                    isOpen 
                      ? 'border-violet-500/50 shadow-lg shadow-violet-500/10' 
                      : 'border-violet-500/20'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 flex-shrink-0 transition-colors ${
                        isOpen ? 'text-violet-400' : 'text-violet-400/70'
                      }`} />
                      <span className={`font-medium transition-colors ${
                        isOpen ? 'text-violet-200' : 'text-violet-200/90'
                      }`}>
                        {faq.question}
                      </span>
                    </div>
                    {isOpen ? (
                      <Minus className="h-5 w-5 text-violet-400" />
                    ) : (
                      <Plus className="h-5 w-5 text-violet-400/70" />
                    )}
                  </button>
                  
                  
                  <div
                    className={`px-6 overflow-hidden transition-all duration-300 ${
                      isOpen ? 'pb-4 max-h-40' : 'max-h-0'
                    }`}
                  >
                    <p className="text-violet-200/80">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <ScrollLink
              to="pricing"
              smooth={true}
              duration={500}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg font-medium text-white transition-all duration-200 hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-violet-500/30 cursor-pointer"
            >
              <Crown className="h-5 w-5" />
              View Pricing Plans
              <ArrowRight className="h-5 w-5" />
            </ScrollLink>
          </div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section 
        id="pricing" 
        ref={pricingRef}
        className="py-12 px-4 bg-[#1a0b2e]/20 border-t border-b border-purple-500/10"
      >
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={pricingInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Unlock Your Sound Power
            </h2>
            <p className="text-violet-200/80 text-lg">
              Get everything you need to create, export, and monetize sound
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className="bg-[#1a0b2e]/50 backdrop-blur-sm rounded-xl border border-violet-500/20 p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-violet-300 mb-2">Free Plan</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-violet-200">$0</span>
                  <span className="text-violet-300/70">/forever</span>
                </div>
                <p className="text-violet-200/70 text-sm mt-2">
                  Start your sound journey
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-violet-200/90">
                  <Check className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <span>Basic frequency generator</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-violet-200/90">
                  <Check className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <span>Standard waveform visualizer</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-violet-200/90">
                  <Check className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <span>3 starter presets</span>
                </li>
                
                
                <li className="flex items-center gap-2 text-sm text-violet-200/90">
                  <Check className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <span>Preview-quality WAV export</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-violet-200/90">
                  <Check className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <span>No credit card required</span>
                </li>
              </ul>

              <Link
                to="/app"
                className="block w-full text-center px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-lg font-medium transition-colors group"
              >
                <SparklesIcon className="inline-block h-4 w-4 mr-2" />
                Create Your First Sound Now
                <ArrowRight className="inline-block ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Pro Monthly */}
            <div className="bg-gradient-to-b from-violet-900/20 to-fuchsia-900/20 backdrop-blur-sm rounded-xl border border-violet-500/50 p-6 md:scale-105 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1 rounded-full text-xs font-medium text-white shadow-lg">
                Most Popular • Cancel Anytime
              </div>

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-violet-300 mb-2">Pro Monthly</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-violet-200">$22</span>
                  <span className="text-violet-300/70">/month</span>
                </div>
                <p className="text-violet-200/70 text-sm mt-2">
                  Unlock your full creative potential
                </p>
              </div>

              <div className="space-y-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-violet-300 mb-2">Creativity Tools</h4>
                  <ul className="space-y-2">
                    {proFeatures.creativity.map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-center gap-2 text-sm text-violet-200/90">
                        <Icon className="h-4 w-4 text-violet-400 flex-shrink-0" />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-violet-300 mb-2">Professional Control</h4>
                  <ul className="space-y-2">
                    {proFeatures.control.map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-center gap-2 text-sm text-violet-200/90">
                        <Icon className="h-4 w-4 text-violet-400 flex-shrink-0" />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-violet-300 mb-2">Monetization</h4>
                  <ul className="space-y-2">
                    {proFeatures.monetization.map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-center gap-2 text-sm text-violet-200/90">
                        <Icon className="h-4 w-4 text-violet-400 flex-shrink-0" />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => handleCheckout(STRIPE_PRODUCTS.monthly.priceId)}
                disabled={loading || selectedPlan === STRIPE_PRODUCTS.monthly.priceId}
                className="block w-full text-center px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-violet-500/25 group animate-pulse-gentle"
              >
                <Lock className="inline-block h-4 w-4 mr-2" />
                {selectedPlan === STRIPE_PRODUCTS.monthly.priceId ? 'Opening Checkout...' : 'Unlock With Pro'}
                <ArrowRight className="inline-block ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <p className="text-center text-violet-300/60 text-xs mt-2">
                Best for creators getting started • Cancel anytime
              </p>
            </div>

            {/* Pro 6-Month Plan */}
            <div className="bg-[#1a0b2e]/50 backdrop-blur-sm rounded-xl border border-violet-500/20 p-6 relative">
              <div className="absolute -top-3 right-4 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1 rounded-full text-xs font-medium text-white shadow-lg">
                Save 33%
              </div>

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-violet-300 mb-2">Pro 6-Month</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-violet-200">$88</span>
                  <span className="text-violet-300/70">/6 months</span>
                </div>
                <p className="text-violet-200/70 text-sm mt-2">
                  Maximum value. Early access. Ultimate freedom.
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-violet-200/90">
                  <Star className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <span>Everything in Monthly plan</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-violet-200/90">
                  <Brain className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <span>Early access to AI features</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-violet-200/90">
                  <Rocket className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <span>Priority feature unlocks</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-violet-200/90">
                  <Crown className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <span>Premium preset templates</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-violet-200/90">
                  <Check className="h-4 w-4 text-violet-400 flex-shrink-0" />
                  <span>One-time payment</span>
                </li>
              </ul>

              <button
                onClick={() => handleCheckout(STRIPE_PRODUCTS.yearly.priceId)}
                disabled={loading || selectedPlan === STRIPE_PRODUCTS.yearly.priceId}
                className="block w-full text-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 group"
              >
                <Lock className="inline-block h-4 w-4 mr-2" />
                {selectedPlan === STRIPE_PRODUCTS.yearly.priceId ? 'Opening Checkout...' : 'Go All In — Save 33%'}
                <ArrowRight className="inline-block ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <p className="text-center text-violet-300/60 text-xs mt-2">
                Best value • Ideal for long-term sound monetizers
              </p>
            </div>
          </div>

          {/* Security Trust Signals */}
          <div className="mt-8 text-center">
            <div className="flex flex-wrap items-center justify-center gap-8 mb-4">
              <div className="flex items-center gap-2 text-violet-300/70 bg-[#1a0b2e]/30 px-4 py-2 rounded-lg">
                <Shield className="h-5 w-5" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center gap-2 text-violet-300/70 bg-[#1a0b2e]/30 px-4 py-2 rounded-lg">
                <CreditCard className="h-5 w-5" />
                <span>Powered by Stripe</span>
              </div>
              <div className="flex items-center gap-2 text-violet-300/70 bg-[#1a0b2e]/30 px-4 py-2 rounded-lg">
                <Lock className="h-5 w-5" />
                <span>256-bit Encryption</span>
              </div>
            </div>
            <p className="text-violet-300/60">
              All payments are processed securely via Stripe and encrypted.
              Your data is protected by industry-standard security measures.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto flex justify-center items-center gap-8">
          <Link to="/terms" className="text-sm text-purple-300/60 hover:text-purple-300/80 transition-colors">
            Terms of Service
          </Link>
          <Link to="/privacy" className="text-sm text-purple-300/60 hover:text-purple-300/80 transition-colors">
            Privacy Policy
          </Link>
          <Link to="/licensing" className="text-sm text-purple-300/60 hover:text-purple-300/80 transition-colors">
            Licensing
          </Link>
          <Link to="/science" className="text-sm text-purple-300/60 hover:text-purple-300/80 transition-colors">
            Swizard Science
          </Link>
          <a 
            href="mailto:hello@realsoundwizard.com" 
            className="text-sm text-purple-300/60 hover:text-purple-300/80 transition-colors"
          >
            Contact
          </a>
        </div>
      </footer>

      {/* Checkout Confirmation Modal */}
      {showConfirmModal && selectedPlanDetails && (
        <div
          id="checkout-modal"
          className="fixed inset-0 flex items-center justify-center z-50 px-4 py-6"
        >
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirmModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#1a0b2e]/90 backdrop-blur-lg rounded-xl border border-violet-500/30 p-8 max-w-lg w-full relative z-10"
          >
            <h3 className="text-2xl font-bold text-center bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-6">
              Ready to Transform Your Sound?
            </h3>

            <div className="space-y-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-violet-200 mb-1">
                  {selectedPlanDetails.price}
                  <span className="text-violet-300/70 text-lg">/{selectedPlanDetails.period}</span>
                </div>
                <p className="text-violet-300/70">{selectedPlanDetails.name}</p>
              </div>

              <ul className="space-y-3">
                {selectedPlanDetails.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-violet-200">
                    <Check className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedPlan(null);
                }}
                className="flex-1 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-lg font-medium transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  handleCheckoutProcess(selectedPlan!);
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-violet-500/25 group"
              >
                <Lock className="inline-block h-4 w-4 mr-2" />
                Proceed to Checkout
                <ArrowRight className="inline-block ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <p className="text-center text-violet-300/60 text-xs mt-4">
              Secure checkout powered by Stripe • Cancel anytime
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Landing;