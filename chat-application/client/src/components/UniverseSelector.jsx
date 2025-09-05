import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { useSocket } from '@/context/SocketContext';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Plus, Hash } from 'lucide-react';

const UniverseSelector = ({ dmId, onUniverseChange }) => {
  const { userInfo } = useAppStore();
  const socket = useSocket();
  const [universes, setUniverses] = useState([]);
  const [selectedUniverseId, setSelectedUniverseId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUniverseName, setNewUniverseName] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch universes when dmId changes
  useEffect(() => {
    if (dmId) {
      fetchUniverses();
    }
  }, [dmId]);

  const fetchUniverses = async () => {
    try {
      const response = await apiClient.get(`/api/message/dm/${dmId}/universes`, {
        withCredentials: true
      });
      if (response.data?.universes) {
        setUniverses(response.data.universes);
        // Select first universe by default
        if (response.data.universes.length > 0 && !selectedUniverseId) {
          const firstUniverse = response.data.universes[0];
          setSelectedUniverseId(firstUniverse._id);
          onUniverseChange?.(firstUniverse._id);
          joinUniverse(firstUniverse._id);
        }
      }
    } catch (error) {
      console.error('Error fetching universes:', error);
      toast.error('Failed to load universes');
    }
  };

  const joinUniverse = (universeId) => {
    if (socket && dmId && universeId) {
      socket.emit('joinUniverse', { dmId, universeId });
    }
  };

  const leaveUniverse = (universeId) => {
    if (socket && dmId && universeId) {
      socket.emit('leaveUniverse', { dmId, universeId });
    }
  };

  const handleUniverseSelect = (universeId) => {
    if (selectedUniverseId) {
      leaveUniverse(selectedUniverseId);
    }
    setSelectedUniverseId(universeId);
    onUniverseChange?.(universeId);
    joinUniverse(universeId);
  };

  const handleCreateUniverse = async () => {
    if (!newUniverseName.trim()) {
      toast.error('Please enter a universe name');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post(`/api/message/dm/${dmId}/universes`, {
        name: newUniverseName.trim()
      }, {
        withCredentials: true
      });

      if (response.data?.universe) {
        const newUniverse = response.data.universe;
        setUniverses(prev => [...prev, newUniverse]);
        setSelectedUniverseId(newUniverse._id);
        onUniverseChange?.(newUniverse._id);
        joinUniverse(newUniverse._id);
        setShowCreateModal(false);
        setNewUniverseName('');
        toast.success(`Universe "${newUniverse.name}" created!`);
      }
    } catch (error) {
      console.error('Error creating universe:', error);
      toast.error('Failed to create universe');
    } finally {
      setLoading(false);
    }
  };

  const selectedUniverse = universes.find(u => u._id === selectedUniverseId);

  if (!dmId) return null;

  return (
    <div className="bg-[#2f303b] border-b border-[#3f4049]">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {universes.map((universe) => (
            <button
              key={universe._id}
              onClick={() => handleUniverseSelect(universe._id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedUniverseId === universe._id
                  ? 'bg-[#6c46f5] text-white'
                  : 'bg-[#3f4049] text-gray-300 hover:bg-[#4f5059] hover:text-white'
              }`}
            >
              <Hash className="w-4 h-4" />
              {universe.name}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#6c46f5] text-white rounded-lg text-sm font-medium hover:bg-[#5a3ddb] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Universe</span>
        </button>
      </div>

      {/* Create Universe Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2f303b] rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Universe</h3>
            <input
              type="text"
              value={newUniverseName}
              onChange={(e) => setNewUniverseName(e.target.value)}
              placeholder="Enter universe name..."
              className="w-full px-3 py-2 bg-[#3f4049] border border-[#4f5059] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#6c46f5] mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateUniverse();
                if (e.key === 'Escape') setShowCreateModal(false);
              }}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-[#3f4049] text-gray-300 rounded-lg hover:bg-[#4f5059] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUniverse}
                disabled={loading || !newUniverseName.trim()}
                className="px-4 py-2 bg-[#6c46f5] text-white rounded-lg hover:bg-[#5a3ddb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniverseSelector;
