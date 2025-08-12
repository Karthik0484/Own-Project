import { TabsContent,  TabsTrigger } from "@radix-ui/react-tabs";
import login from "../../assets/login.jpg";
import Background from "../../assets/Background.png";
import { Tabs, TabsList } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { LOGIN_ROUTE, SIGNUP_ROUTE } from "@/utils/constants";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";


const Auth = () => { 

  const navigate = useNavigate();
  const {setUserInfo} = useAppStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // My code

  useEffect(() => {
    setEmail(localStorage.getItem("email") || "");
    setPassword(localStorage.getItem("password") || "");
    setConfirmPassword(localStorage.getItem("confirmPassword") || "");
  }, []);

  useEffect(() => {
    localStorage.setItem("email", email);
  }, [email]);
  
  useEffect(() => {
    localStorage.setItem("password", password);
  }, [password]);

 // MY code

const emailRegex = /^[^\s@]+@[^s@]+\.[^\s@]+$/;

const validateLogin = () => {
  if (!email.length) {
    toast.error("Email is required.");
    return false;
  }
  if (!emailRegex.test(email)) {
    toast.error("Please enter a valid email address.");
    return false;
  }
  if (!password.length) {
    toast.error("Password is required.");
    return false;
  }
  if (password.length < 8) {
    toast.error("Password must be at least 8 characters long.");
    return false;
  }
  return true;
};


  const validateSignup = () =>{
   
    if (!email.length) {
      toast.error("Email is required.");
      return false;
    }
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    if (!password.length) {
      toast.error("Password is required.");
      return false;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return false;
    }
    if(password !== confirmPassword){
      toast.error("password and confirm password does not match.");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if(validateLogin()) {
      const response = await apiClient.post(
        LOGIN_ROUTE,
        {email,password},
        {withCredentials: true}
      );
      if(response.data.user.id){
        setUserInfo(response.data.user);
        // Store JWT token for session persistence
        if (response.data.token) {
          localStorage.setItem('authToken', response.data.token);
        }


        // MY code Clear localStorage on successful login
        localStorage.removeItem("email");
        localStorage.removeItem("password");


        if(response.data.user.profileSetup) navigate('/chat');
          else navigate("/profile");
      }
      console.log({ response });
    }
  };

  const handleSignup = async () => {
    if (validateSignup()) {
      const response = await apiClient.post(
        SIGNUP_ROUTE,
        { email,password },
        {withCredentials: true}
      );
      if (response.status === 201){
        setUserInfo(response.data.user);
        // Store JWT token for session persistence
        if (response.data.token) {
          localStorage.setItem('authToken', response.data.token);
        }

          // MY code Clear localStorage on successful login
          localStorage.removeItem("email");
          localStorage.removeItem("password");
          localStorage.removeItem("confirmPassword");

        navigate("/profile");
      }
      console.log({ response });    
    }
  };


  return (
    <div className="min-h-[100vh] w-full flex items-center justify-center px-4 py-8">
      <div className="min-h-[70vh] bg-white text-opacity-90 shadow-2xl w-full max-w-[1200px] rounded-3xl grid grid-cols-1 xl:grid-cols-2">
        <div className="flex flex-col gap-8 items-center justify-center p-6 sm:p-10">
          <div className="flex items-center justify-center flex-col">
            <div className="flex items-center justify-center gap-3">
             <h1 className="font-bold [font-size:clamp(28px,6vw,56px)]">Connectify</h1>
             <img src={login} alt="Victory Emoji" className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover" />
            </div>
            <p className="font-medium text-center [font-size:clamp(14px,3.5vw,18px)]">Login To Start Exploring.
            </p>
          </div>
          <div className="flex items-center justify-center w-full">
            <Tabs className="w-full max-w-[520px]" defaultValue="login">
              <TabsList className="bg-transparent rounded-none w-full">
                <TabsTrigger value="login"
                className="data-[state=active]:bg-transparent text-black text-opacity-90 border-b-2 rounded-none w-full data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:border-b-purple-500 p-2 sm:p-3 transition-all duration-300"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup"
                 className="data-[state=active]:bg-transparent text-black text-opacity-90 border-b-2 rounded-none w-full data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:border-b-purple-500 p-2 sm:p-3 transition-all duration-300"
                >
                  Signup
                </TabsTrigger>
              </TabsList>

              <TabsContent className="flex flex-col gap-5 mt-10" value="login">
              <Input 
              placeholder="Email" 
              type="email"
              className="rounded-full p-4 sm:p-6"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              />
              <Input 
              placeholder="Password" 
              type="password"
              className="rounded-full p-4 sm:p-6"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              />

              <Button className="rounded-full h-11 sm:h-12 text-base sm:text-lg" onClick={handleLogin}>
                Login
              </Button>

              </TabsContent>

              <TabsContent className="flex flex-col gap-5 mt-10"
              value="signup">
              <Input 
              placeholder="Email" 
              type="email"
              className="rounded-full p-4 sm:p-6"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              />
              <Input 
              placeholder="Password" 
              type="password"
              className="rounded-full p-4 sm:p-6"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              />
               <Input 
               placeholder="ConfirmPassword" 
              type="password"
              className="rounded-full p-4 sm:p-6"
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              />
               <Button className="rounded-full h-11 sm:h-12 text-base sm:text-lg" onClick={handleSignup}>
                 Signup
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <div className="hidden xl:flex justify-center items-center p-10">
          <img src={Background} alt="background login" className="max-w-full h-auto" />

        </div>
       </div>
    </div>
  );
};

export default Auth;
