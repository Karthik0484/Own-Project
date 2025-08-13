import { useAppStore } from '@/store';
import { getColor } from '@/lib/utils';
import { RiCloseFill, RiArrowLeftLine } from 'react-icons/ri';
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
    navigate('/chat');
  };

  return (
    <div className="h-[10vh] border-b-2 border-[#2f303b] flex items-center justify-between px-4 sm:px-6 md:px-10 xl:px-20">
      <div className="flex gap-3 sm:gap-5 items-center w-full justify-between">
        {/* Back button on mobile to show sidebar */}
        <button
          className="md:hidden text-neutral-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={handleClose}
          aria-label="Back"
        >
          <RiArrowLeftLine className="text-2xl" />
        </button>
        <div className="flex gap-3 items-center justify-center ">
          <div className="relative flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12">
            {
              selectedChatType === "contact" ? 
            
            <Avatar className="rounded-full overflow-hidden w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12">
              {avatarUrl ? (
                <img
                  src={avatarUrl.startsWith('http') ? avatarUrl : `${HOST}/${avatarUrl}`}
                  alt="profile"
                  className="object-cover w-full h-full bg-black rounded-full"
                  loading="lazy"
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentNode.querySelector('.avatar-fallback').style.display = 'flex'; }}
                />
              ) : null}
              <div className={`avatar-fallback rounded-full bg-purple-500 flex items-center justify-center text-white font-bold w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12`}
                style={{ display: avatarUrl ? 'none' : 'flex', position: 'absolute', top: 0, left: 0 }}>
                {avatarInitial.toUpperCase()}
              </div>
              {/* Online dot */}
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </Avatar>
            :(
              <div className='bg-[ffffff22] h-10 w-10 flex items-center justify-center rounded-full'>
                #
              </div>
           ) }
          </div>
          <div>
            <div className="font-semibold">
              {selectedChatType === "channel" && selectedChatData?.name && (
                <span>{selectedChatData.name}</span>
              )}
              {selectedChatType === "contact" && selectedChatData?.firstName ? (
                <span>{`${selectedChatData.firstName} ${selectedChatData.lastName}`}</span>
              ) : selectedChatType === "contact" && selectedChatData?.email ? (
                <span>{selectedChatData.email}</span>
              ) : null}
            </div>
            <div className="text-xs text-gray-400">
              {selectedChatType === "contact" && (isOnline ? (
                <span className="text-green-500 font-medium">Online</span>
              ) : (
                lastSeenFormatted && <span>Last seen: {lastSeenFormatted}</span>
              ))}
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