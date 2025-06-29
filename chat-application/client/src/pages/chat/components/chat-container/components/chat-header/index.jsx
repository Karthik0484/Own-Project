import { useAppStore } from '@/store';
import { getColor } from '@/lib/utils';
import { RiCloseFill } from 'react-icons/ri';
import { Avatar, AvatarImage } from '@radix-ui/react-avatar';
import { HOST } from '@/utils/constants';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const ChatHeader = () => {
  const { closeChat, selectedChatData, selectedChatType, onlineUsers } = useAppStore();
  const navigate = useNavigate();

  const isOnline = selectedChatData?._id && onlineUsers?.[selectedChatData._id];
  const lastSeen = selectedChatData?.lastSeen;
  const lastSeenFormatted = lastSeen ? format(new Date(lastSeen), 'MMM d, yyyy • h:mm a') : '';
  const avatarUrl = selectedChatData.profileImage || selectedChatData.image;
  const avatarInitial = selectedChatData.firstName
    ? selectedChatData.firstName[0].toUpperCase()
    : selectedChatData.lastName
    ? selectedChatData.lastName[0].toUpperCase()
    : '?';

  const handleClose = () => {
    closeChat();
    navigate('/');
  };

  return (
    <div className="h-[10vh] border-b-2 border-[#2f303b] flex items-center justify-between px-20">
      <div className="flex gap-5 items-center w-full justify-between px-20">
        <div className="flex gap-3 items-center justify-center " >
          <div className="w-12 h-12 relative">
            <Avatar className="h-12 w-12  rounded-full overflow-hidden ">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="profile"
                  className="object-cover w-full h-full bg-black"
                />
              ) : (
                <div className={`uppercase h-12 w-12 text-lg border-[1px] flex items-center justify-center rounded-full ${getColor(selectedChatData.color)}`}>
                  {avatarInitial}
                </div>
              )}
              {/* Online dot */}
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </Avatar>
          </div>
          <div>
            <div className="font-semibold">
              {
                selectedChatType === "contact" && selectedChatData.firstName 
                ? `${selectedChatData.firstName} ${selectedChatData.lastName}`
                : selectedChatData.email
              }
            </div>
            <div className="text-xs text-gray-400">
              {isOnline ? (
                <span className="text-green-500 font-medium">Online</span>
              ) : (
                lastSeenFormatted && <span>Last seen: {lastSeenFormatted}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center jus gap-5">
          <button className="text-neutral-500 focus:border-none focus:outline-none focus:text-white duration-300 transition-all" 
            onClick={handleClose}
          >
            <RiCloseFill className="text-3xl"/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;