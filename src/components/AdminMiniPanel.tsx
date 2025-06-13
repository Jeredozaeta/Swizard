import React, { useState } from 'react';
import { Shield, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const AdminMiniPanel: React.FC = () => {
  const { user, isAdmin, adminOverride, hasUnlimitedAccess, toggleAdminOverride } = useAuth();
  const [isToggling, setIsToggling] = useState(false);

  // Only show for admin users
  if (!user || !isAdmin) {
    return null;
  }

  const handleToggle = async () => {
    if (isToggling) return;
    
    setIsToggling(true);
    try {
      await toggleAdminOverride();
      toast.success(`Admin Override ${!adminOverride ? 'ENABLED' : 'DISABLED'}`, {
        icon: !adminOverride ? '🔓' : '🔒',
        position: "bottom-right",
        autoClose: 2000
      });
    } catch (error) {
      console.error('Failed to toggle admin override:', error);
      toast.error('Failed to toggle admin override');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-gray-900/95 backdrop-blur-sm rounded-lg border border-purple-500/30 px-3 py-2 shadow-lg">
      {/* Status Badge */}
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
        adminOverride 
          ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
          : 'bg-red-600/20 text-red-400 border border-red-500/30'
      }`}>
        {adminOverride ? (
          <ShieldCheck className="h-3 w-3" />
        ) : (
          <Shield className="h-3 w-3" />
        )}
        <span>Override {adminOverride ? 'ON' : 'OFF'}</span>
      </div>

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        disabled={isToggling}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
          isToggling 
            ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
            : adminOverride
              ? 'bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30'
              : 'bg-green-600/20 text-green-300 hover:bg-green-600/30 border border-green-500/30'
        }`}
        title={`${adminOverride ? 'Disable' : 'Enable'} Admin Override`}
      >
        {isToggling ? 'Toggling...' : adminOverride ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
};

export default AdminMiniPanel;