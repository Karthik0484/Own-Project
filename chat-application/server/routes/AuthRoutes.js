import { Router } from "express";
import { getUserInfo,
         login, 
         signup ,  
         updateProfile, 
         addProfileImage,
         removeProfileImage,
         logout,
} from "../controllers/AuthController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import multer from "multer";



const authRoutes = Router();
const upload = multer({ dest:"uploads/profiles/" });

authRoutes.post("/signup", signup);
authRoutes.post("/login", login);
authRoutes.get("/user-info", verifyToken, getUserInfo);
authRoutes.post("/update-profile", verifyToken, updateProfile);
authRoutes.post(
    "/add-profile-image", 
    verifyToken,
    upload.single("profile-image"), 
    addProfileImage);

authRoutes.delete("/remove-profile-image", verifyToken, removeProfileImage)
authRoutes.post("/logout", logout);
authRoutes.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_KEY);
    const user = await require('../models/UserModel.js').default.findById(decoded.userId);
    if (!user) return res.sendStatus(404);
    res.json({
      id: user.id,
      email: user.email,
      profileSetup: user.profileSetup,
      firstName: user.firstName,
      lastName: user.lastName,
      image: user.image,
      color: user.color,
    });
  } catch (err) {
    return res.sendStatus(403);
  }
});

export default authRoutes;