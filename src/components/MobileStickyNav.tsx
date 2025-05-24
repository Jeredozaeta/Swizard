import React, { useState, useEffect } from 'react';
import { Link } from 'react-scroll';

const MobileStickyNav: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const toggle = () => setShow(window.scrollY > 200);
    toggle();
    window.addEventListener('scroll', toggle);
    return () => window.removeEventListener('scroll', toggle);
  }, []);

  return show ? (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 sm:hidden bg-[#1a0b2e] px-4 py-2 rounded-full flex gap-6 text-sm border border-purple-500/20 shadow-lg">
      <Link
        to="hero"
        smooth={true}
        duration={500}
        className="text-purple-300 hover:text-purple-200 transition-colors cursor-pointer"
      >
        🎛 Generator
      </Link>
      <Link
        to="pricing"
        smooth={true}
        duration={500}
        className="text-purple-300 hover:text-purple-200 transition-colors cursor-pointer"
      >
        💸 Pricing
      </Link>
    </nav>
  ) : null;
};

export default MobileStickyNav;