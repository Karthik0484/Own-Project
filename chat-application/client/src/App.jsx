import React, { children, useEffect } from 'react';
import { Button } from './components/ui/button';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Auth from './pages/auth';
import Chat from './pages/chat';
import Profile from './pages/profile';
import { useAppStore } from './store';
import { apiClient } from './lib/api-client';
import { useState } from "react";

// Defining Private Route and Auth Route.

const PrivateRoute = ({children}) =>{
  const {userInfo} = useAppStore();
  const isAuthenticated = !!userInfo;
  return isAuthenticated ? children : <Navigate to="/auth"/>;
};

const AuthRoute = ({children}) =>{
  const {userInfo} = useAppStore();
  const isAuthenticated = !!userInfo;
  return isAuthenticated ?  <Navigate to="/chat"/> : children;
};

const App = () => {
  const { userInfo, setUserInfo, initializeAuth } = useAppStore();
  const [loading, setloading] = useState(true);
  
  useEffect(() =>{
    initializeAuth(); // <-- Rehydrate from localStorage on app load
  }, [initializeAuth]);

  useEffect(() =>{
    const getUserData = async() =>{
      try{
        const response = await apiClient.get(GET_USER_INFO,
          {withCredentials:true,
  });
  if(response.status ===200 && response.data.id) {
    setUserInfo(response.data);
  } else{
    setUserInfo(undefined);
  }   
  console.log({response});
 }
      catch(error){
        setUserInfo(undefined);
      } finally{
        setloading(false);
      }
    };
    if(!userInfo){
      getUserData()
  
    }else{
      setloading(false);
    }
  },[userInfo,setUserInfo]);
  if(loading){
    return <div>Please Wait Loading...</div>;
  }


  return (
    <BrowserRouter>
     <Routes>
      <Route 
       path="/auth" 
       element={
       <AuthRoute>
        <Auth />
       </AuthRoute>
      } 
      />
      <Route
       path="/chat"
       element={ 
       <PrivateRoute>
        <Chat />
       </PrivateRoute> 
       }
       />
      <Route 
       path="/chat/:contactId"
        element={ 
        <PrivateRoute>
         <Chat />
        </PrivateRoute> 
        }
       />
      <Route 
       path="/profile"
        element={
        <PrivateRoute>
        <Profile />
       </PrivateRoute> 
       } />
      <Route path="*" element={<Navigate to="/auth" />} />
     </Routes>
    </BrowserRouter>
  );
};

export default App;