import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";
import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import { HOST, LOGOUT_ROUTE } from "@/utils/constants";
import { FiEdit2 } from "react-icons/fi";
import { IoPowerSharp} from "react-icons/io5"
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";


const ProfileInfo = () => {
    const { userInfo, setUserInfo } = useAppStore();
    const navigate = useNavigate();

    const logOut = async() => {
      try{
        const response = await apiClient.post(
          LOGOUT_ROUTE,
          {},
          {withCredentials: true}
        );

        if(response.status === 200){
          navigate("/auth");
          setUserInfo(null);
        }

      } catch(error) {
        console.log(error);
      }
    };

  return (
    <div className="absolute bottom-0 h-16 flex items-center justify-between px-10 w-full bg-[#2a2b33]">
        <div className="flex gap-3 items-center justify-center">
            <div className="relative flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12">
              {userInfo?.image ? (
                <img
                  src={userInfo.image.startsWith('http') ? userInfo.image : `${HOST}/${userInfo.image}`}
                  alt="profile"
                  loading="lazy"
                  className="rounded-full object-cover border border-gray-300 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; const fb = e.currentTarget.parentNode.querySelector('.avatar-fallback'); if (fb) fb.style.display = 'flex'; }}
                />
              ) : null}
              <div className={`avatar-fallback rounded-full bg-purple-500 flex items-center justify-center text-white font-bold w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ${userInfo?.image ? 'hidden' : ''}`}
                style={{ position: 'absolute', top: 0, left: 0 }}
              >
                { userInfo?.firstName
                  ? userInfo.firstName.charAt(0).toUpperCase()
                  : (userInfo?.email || '?').charAt(0).toUpperCase() }
              </div>
            </div>
            <div>
              {
                userInfo.firstName && userInfo.lastName 
                ? `${userInfo.firstName} ${userInfo.lastName}`
                : ""
              }
            </div>
        </div>
        <div className="flex gap-5">
        <TooltipProvider>
           <Tooltip>
                <TooltipTrigger>
                  <FiEdit2 className="text-purple-500 text-xl font-medium" 
                   onClick={() => navigate('/profile')}
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-[#1c1b1e] border-none text-white">
                  Edit Profile
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
           <Tooltip>
                <TooltipTrigger>
                  <IoPowerSharp className="text-red-500 text-xl font-medium" 
                   onClick={logOut}
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-[#1c1b1e] border-none text-white">
                  Logout
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        </div>
    </div>
  )
};

export default ProfileInfo;