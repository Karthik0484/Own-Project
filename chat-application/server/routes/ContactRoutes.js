import { Router } from "express";
import {verifyToken} from "../middlewares/AuthMiddleware.js"
import { searchContacts, getMessages, getContactsForDMList } from "../controllers/ContactsController.js";

const contactsRoutes = Router();

contactsRoutes.post("/search", verifyToken, searchContacts);
contactsRoutes.get("/messages/:recipientId", verifyToken, getMessages);
contactsRoutes.get("/get-contacts-for-dm", verifyToken, getContactsForDMList)

export default contactsRoutes;
