import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/store';
import { ChevronLeft, ChevronRight, Plus, ExternalLink, Calendar, User, X, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const LiveUpdatesCarousel = ({ groupId, isGroupAdmin = false }) => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    priority: 0,
    expiresAt: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const carouselRef = useRef(null);
  const socket = useSocket();
  const { userInfo } = useAppStore();

  // Check if user is group admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (groupId) {
        try {
          const response = await apiClient.get(`/api/updates/group/${groupId}/admin`, {
            withCredentials: true
          });
          setIsAdmin(response.data.isAdmin);
        } catch (error) {
          console.error('Error checking admin status:', error);
          // Fallback to the prop value if API fails
          setIsAdmin(isGroupAdmin);
        }
      }
    };
    checkAdminStatus();
  }, [groupId, isGroupAdmin]);

  // Fetch updates with retry mechanism
  const fetchUpdates = async (retryAttempt = 0) => {
    if (!groupId) return;
    
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/updates/group/${groupId}/latest?limit=10`, {
        withCredentials: true
      });
      if (response.data.success) {
        setUpdates(response.data.updates);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
      
      if (error.response?.status === 403) {
        toast.error('You must be a member of this group to view updates');
        setRetryCount(0); // Don't retry for permission errors
      } else if (error.response?.status === 401) {
        toast.error('Please log in to view updates');
        setRetryCount(0); // Don't retry for auth errors
      } else {
        // Retry for network/server errors
        if (retryAttempt < 3) {
          const delay = Math.pow(2, retryAttempt) * 1000; // Exponential backoff
          setTimeout(() => {
            fetchUpdates(retryAttempt + 1);
          }, delay);
          setRetryCount(retryAttempt + 1);
        } else {
          toast.error('Failed to fetch updates after multiple attempts');
          setRetryCount(0);
        }
      }
    } finally {
      if (retryAttempt === 0 || retryAttempt >= 3) {
        setLoading(false);
      }
    }
  };

  // Load updates on component mount and group change
  useEffect(() => {
    fetchUpdates();
  }, [groupId]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket || !groupId) return;

    // Join group room for real-time updates
    socket.emit('join-group', { groupId });

    const handleNewUpdate = (update) => {
      setUpdates(prev => [update, ...prev]);
      toast.success('New update available!');
    };

    const handleUpdateUpdated = (update) => {
      setUpdates(prev => prev.map(u => u._id === update._id ? update : u));
    };

    const handleUpdateDeleted = (data) => {
      setUpdates(prev => prev.filter(u => u._id !== data.updateId));
    };

    socket.on('updates:new', handleNewUpdate);
    socket.on('updates:updated', handleUpdateUpdated);
    socket.on('updates:deleted', handleUpdateDeleted);

    return () => {
      socket.off('updates:new', handleNewUpdate);
      socket.off('updates:updated', handleUpdateUpdated);
      socket.off('updates:deleted', handleUpdateDeleted);
      socket.emit('leave-group', { groupId });
    };
  }, [socket, groupId]);

  // Navigation functions
  const goToPrevious = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : updates.length - 1);
  };

  const goToNext = () => {
    setCurrentIndex(prev => prev < updates.length - 1 ? prev + 1 : 0);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        groupId,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
      };

      if (editingUpdate) {
        // Update existing update
        await apiClient.put(`/api/updates/${editingUpdate._id}`, payload, {
          withCredentials: true
        });
        toast.success('Update updated successfully');
        setShowEditModal(false);
      } else {
        // Create new update
        await apiClient.post(`/api/updates/group/${groupId}`, payload, {
          withCredentials: true
        });
        toast.success('Update published successfully');
        setShowAddModal(false);
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        link: '',
        priority: 0,
        expiresAt: ''
      });
      setEditingUpdate(null);
      
      // Refresh updates
      fetchUpdates();
    } catch (error) {
      console.error('Error saving update:', error);
      toast.error(error.response?.data?.error || 'Failed to save update');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (update) => {
    setEditingUpdate(update);
    setFormData({
      title: update.title,
      description: update.description || '',
      link: update.link || '',
      priority: update.priority || 0,
      expiresAt: update.expiresAt ? new Date(update.expiresAt).toISOString().slice(0, 16) : ''
    });
    setShowEditModal(true);
  };

  // Handle delete
  const handleDelete = async (updateId) => {
    if (!window.confirm('Are you sure you want to delete this update?')) return;

    try {
      await apiClient.delete(`/api/updates/${updateId}`, {
        withCredentials: true
      });
      toast.success('Update deleted successfully');
      
      // Refresh updates
      fetchUpdates();
    } catch (error) {
      console.error('Error deleting update:', error);
      toast.error(error.response?.data?.error || 'Failed to delete update');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-300">
            Loading updates... {retryCount > 0 && `(Retry ${retryCount}/3)`}
          </span>
        </div>
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-gray-300 font-medium">Live Updates</span>
          </div>
          {(isAdmin || isGroupAdmin) && (
            <Button
              onClick={() => setShowAddModal(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Publish Update
            </Button>
          )}
        </div>
        <div className="mt-3 text-center text-gray-400">
          No live updates available
          {!(isAdmin || isGroupAdmin) && (
            <div className="text-xs mt-1">
              Only group admins can create updates
            </div>
          )}
          <div className="mt-2">
            <Button
              onClick={() => fetchUpdates()}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentUpdate = updates[currentIndex];

  return (
    <>
      <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-gray-300 font-medium">Live Updates</span>
            <span className="text-xs text-gray-400">({updates.length})</span>
          </div>
          {(isAdmin || isGroupAdmin) && (
            <Button
              onClick={() => setShowAddModal(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Publish Update
            </Button>
          )}
        </div>

        {/* Carousel */}
        <div className="relative">
          <div className="flex items-center space-x-2">
            {/* Navigation buttons */}
            {updates.length > 1 && (
              <>
                <Button
                  onClick={goToPrevious}
                  size="sm"
                  variant="outline"
                  className="p-1 h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Update card */}
            <div className="flex-1 bg-gray-700/50 rounded-lg p-3 min-h-[80px]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-sm mb-1">
                    {currentUpdate.title}
                  </h3>
                  {currentUpdate.description && (
                    <p className="text-gray-300 text-xs mb-2 line-clamp-2">
                      {currentUpdate.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-3 text-xs text-gray-400">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{currentUpdate.createdBy?.firstName} {currentUpdate.createdBy?.lastName}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(currentUpdate.createdAt)}</span>
                    </div>
                    {currentUpdate.priority > 0 && (
                      <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs">
                        Priority {currentUpdate.priority}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 ml-2">
                  {currentUpdate.link && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="p-1 h-6 w-6"
                    >
                      <a
                        href={currentUpdate.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  )}
                  
                  {(isAdmin || isGroupAdmin) && (
                    <>
                      <Button
                        onClick={() => handleEdit(currentUpdate)}
                        size="sm"
                        variant="outline"
                        className="p-1 h-6 w-6"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(currentUpdate._id)}
                        size="sm"
                        variant="outline"
                        className="p-1 h-6 w-6 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            {updates.length > 1 && (
              <Button
                onClick={goToNext}
                size="sm"
                variant="outline"
                className="p-1 h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Dots indicator */}
          {updates.length > 1 && (
            <div className="flex justify-center space-x-1 mt-2">
              {updates.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-blue-500' : 'bg-gray-500'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Publish Update Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Publish New Update</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter update title"
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter update description"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white resize-none"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Link
              </label>
              <Input
                value={formData.link}
                onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                placeholder="https://example.com"
                className="bg-gray-700 border-gray-600 text-white"
                type="url"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value={0}>Normal</option>
                  <option value={1}>Low</option>
                  <option value={5}>Medium</option>
                  <option value={10}>High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Expires At
                </label>
                <Input
                  value={formData.expiresAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  type="datetime-local"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? 'Publishing...' : 'Publish Update'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Update Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Update</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter update title"
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter update description"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white resize-none"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Link
              </label>
              <Input
                value={formData.link}
                onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                placeholder="https://example.com"
                className="bg-gray-700 border-gray-600 text-white"
                type="url"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value={0}>Normal</option>
                  <option value={1}>Low</option>
                  <option value={5}>Medium</option>
                  <option value={10}>High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Expires At
                </label>
                <Input
                  value={formData.expiresAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  type="datetime-local"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LiveUpdatesCarousel;
