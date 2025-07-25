import { request } from "express";
import User from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import { compare } from "bcryptjs";
import { renameSync, unlinkSync } from "fs";

const maxAge = 3* 24 * 60 * 60 * 1000;

const createToken = (email,userId) => {
    return jwt.sign({ email,userId },process.env.JWT_KEY,{ 
        expiresIn: maxAge,
        
    });
};

export const signup = async (request, response, next) => {
    try{
        console.log("Signup request received:", request.body);
        const{ email,password } = request.body;
        if(!email || !password){
            console.log("Validation failed: Email or password missing.");
            return response.status(400).send("Email and Password is required.")
        }
    console.log("Creating user...");
    const user = await User.create({ email,password });
    console.log("User created successfully:", user);
    
    console.log("Creating token...");
    const token = createToken(email,user.id);
    console.log("Token created:", token);

    console.log("Setting cookie...");
    response.cookie("jwt", token, {
        maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true if HTTPS
        sameSite: "Lax",
        path: "/"
    });
    console.log("Cookie set. Sending response.");
    return response.status(201).json({
    user:{
        id: user.id,
        email: user.email,
        profileSetup: user.profileSetup,      
    },
   });

  }
    catch(error) {
        console.error("Error during signup:", error);
        return response.status(500).send("Internal Server Error");
    }
};

// LOGIN page

export const login =   async (request, response, next) => {
    try{
        const{ email,password } = request.body;
        if(!email || !password){
            return response.status(400).send("Email and Password is required.");
        }
    const user = await User.findOne({ email }); 
    if(!user){
        return response.status(404).send("User with given email not found.");
    }
    const auth = await compare(password, user.password);
    if(!auth){
        return response.status(400).send("Password is incorrect.");   
    }

    response.cookie("jwt", createToken(email, user.id), {
        maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true if HTTPS
        sameSite: "Lax",
        path: "/"
    });
    return response.status(200).json({
    user:{
        id: user.id,
        email: user.email,
        profileSetup: user.profileSetup,
        firstName: user.firstName,
        lastName: user.lastName, 
        image: user.image,
        color: user.color, 
    },
   });
} catch(error) {
        console.log({ error });
        return response.status(500).send("Internal Server Error");
    }
};

export const getUserInfo = async (request, response, next) => {
    try{
      const userData = await User.findById(request.userId);
      if(!userData) {
        return response.status(404).send("User with given id not found.");
      }
        
    return response.status(200).json({
        id: userData.id,
        email: userData.email,
        profileSetup: userData.profileSetup,
        firstName: userData.firstName,
        lastName: userData.lastName, 
        image: userData.image,
        color: userData.color, 
   }); 

  } catch(error) {
        console.log({ error });
        return response.status(500).send("Internal Server Error");
    }
};

// Profile Page

export const updateProfile = async (request, response, next) => {
    try{
      const {userId} = request;
      const { firstName, lastName, color} = request.body;
      if(!firstName || !lastName || !color) {
        return response.status(404).send("Firstname lastname and color is required.");
      }

      const userData = await User.findByIdAndUpdate(
        userId,
        {
        firstName,
        lastName,
        color,
        profileSetup:true
      },
      {new : true,runValidators: true}
    );
        


    return response.status(200).json({
        id: userData.id,
        email: userData.email,
        profileSetup: userData.profileSetup,
        firstName: userData.firstName,
        lastName: userData.lastName, 
        image: userData.image,
        color: userData.color, 
   }); 

  } catch(error) {
        console.log({ error });
        return response.status(500).send("Internal Server Error");
    }
};


export const addProfileImage = async (request, response, next) => {
    try{
        if(!request.file){
            return response.status(400).send("File is required.");
        }

        const date = Date.now();

        // Ensure unique filename and correct path
        const fileName = `uploads/profiles/${date}_${request.file.originalname}`;
        renameSync(request.file.path, fileName);

        // Store only the relative path for frontend use
        const relativePath = `profiles/${date}_${request.file.originalname}`;


        const updatedUser = await User.findByIdAndUpdate(
            request.userId,
            { image: relativePath },
            { new: true, runValidators: true }
        );


    return response.status(200).json({
        image: updatedUser.image,
   }); 

  } catch(error) {
        console.log({ error });
        return response.status(500).send("Internal Server Error");
    }
};


export const removeProfileImage = async (request, response, next) => {
    try{
      const { userId } = request;
      const user = await User.findById(userId);

      if(!user) {
        return response.status(404).send("User not found..")
      }

      if(user.image){
        unlinkSync(user.image);
      }

      user.image = null;
      await user.save();
        


    return response.status(200).send("Profile image removed successfully"); 
  } catch(error) {
        console.log({ error });
        return response.status(500).send("Internal Server Error");
    }
};

export const logout = async (request, response, next) => {
    try{
    response.cookie("jwt","",{maxAge: 1, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "Lax", path: "/"});
    return response.status(200).send("Logout successfull."); 
  } catch(error) {
        console.log({ error });
        return response.status(500).send("Internal Server Error");
    }
};