import { Router } from "express";
import {verifyToken} from "../middlewares/AuthMiddleware.js"
import { searchContacts, getMessages } from "../controllers/ContactsController.js";

const contactsRoutes = Router();

contactsRoutes.post("/search", verifyToken, searchContacts);
contactsRoutes.get("/messages/:recipientId", verifyToken, getMessages);

export default contactsRoutes;
