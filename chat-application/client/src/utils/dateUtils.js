import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Never seen';
  
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  
  // If last seen is more than 7 days ago, show the date
  const daysDiff = Math.floor((now - lastSeenDate) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 7) {
    return `Last seen ${format(lastSeenDate, 'MMM d, yyyy')}`;
  }
  
  // If last seen is more than 1 day ago, show "X days ago"
  if (daysDiff > 1) {
    return `Last seen ${daysDiff} days ago`;
  }
  
  // If last seen is yesterday, show "Yesterday at X:XX"
  if (isYesterday(lastSeenDate)) {
    return `Last seen yesterday at ${format(lastSeenDate, 'h:mm a')}`;
  }
  
  // If last seen is today, show relative time
  if (isToday(lastSeenDate)) {
    const minutesDiff = Math.floor((now - lastSeenDate) / (1000 * 60));
    
    if (minutesDiff < 1) {
      return 'Last seen just now';
    } else if (minutesDiff < 60) {
      return `Last seen ${minutesDiff} minute${minutesDiff > 1 ? 's' : ''} ago`;
    } else {
      const hoursDiff = Math.floor(minutesDiff / 60);
      return `Last seen ${hoursDiff} hour${hoursDiff > 1 ? 's' : ''} ago`;
    }
  }
  
  // Fallback to relative time
  return `Last seen ${formatDistanceToNow(lastSeenDate, { addSuffix: true })}`;
};

export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const messageDate = new Date(timestamp);
  const now = new Date();
  
  if (isToday(messageDate)) {
    return format(messageDate, 'h:mm a');
  } else if (isYesterday(messageDate)) {
    return 'Yesterday';
  } else {
    return format(messageDate, 'MMM d');
  }
}; 