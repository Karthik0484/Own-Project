import { format, isToday, isYesterday } from 'date-fns';

// Format: 
// - Today: "Last seen today at HH:MM AM/PM"
// - Yesterday: "Last seen yesterday at HH:MM AM/PM"
// - Earlier: "Last seen MMM DD, YYYY at HH:MM AM/PM"
// Handles ISO input and local timezone; minutes are zero-padded via date-fns format.
export const formatLastSeen = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  if (isToday(date)) {
    return `Last seen today at ${format(date, 'h:mm a')}`;
  }
  if (isYesterday(date)) {
    return `Last seen yesterday at ${format(date, 'h:mm a')}`;
  }
  return `Last seen ${format(date, 'MMM d, yyyy')} at ${format(date, 'h:mm a')}`;
};

export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const messageDate = new Date(timestamp);
  
  if (isToday(messageDate)) {
    return format(messageDate, 'h:mm a');
  } else if (isYesterday(messageDate)) {
    return 'Yesterday';
  } else {
    return format(messageDate, 'MMM d');
  }
}; 