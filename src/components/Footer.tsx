import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="text-center text-sm text-purple-300 opacity-70 pt-2">
      Swizard © {currentYear}
    </footer>
  );
};

export default Footer;