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
  const { userInfo, setUserInfo, initializeAuth, setChannels } = useAppStore();
  const [loading, setloading] = useState(true);
  
  useEffect(() =>{
    initializeAuth(); // <-- Rehydrate from localStorage on app load
  }, [initializeAuth]);

  useEffect(() =>{
    const token = localStorage.getItem('authToken');
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      apiClient.get('/api/auth/user-info', { withCredentials: true })
        .then(response => {
          if (response.data && response.data.id) {
            setUserInfo(response.data);
            // Fetch channels after user info is set
            apiClient.get('/api/channel/get-user-channels', { withCredentials: true })
              .then(res => {
                if (res.data) {
                  if (typeof setChannels === 'function') setChannels(res.data);
                }
              });
          } else {
            setUserInfo(undefined);
            localStorage.removeItem('authToken');
          }
          setloading(false);
        })
        .catch(() => {
          setUserInfo(undefined);
          localStorage.removeItem('authToken');
          setloading(false);
        });
    } else {
      setloading(false);
    }
  }, [setUserInfo, setChannels]);
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
