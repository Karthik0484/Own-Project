import User from "../models/UserModel.js";
import Message from "../models/MessagesModel.js";

export const searchContacts = async (request, response, next) => {
    try {
        const { searchTerm } = request.body;
        const userId = request.userId;

        const contacts = await User.find({
            $and: [
                { _id: { $ne: userId } },
                {
                    $or: [
                        { email: { $regex: searchTerm, $options: "i" } },
                        { firstName: { $regex: searchTerm, $options: "i" } },
                        { lastName: { $regex: searchTerm, $options: "i" } },
                    ],
                },
            ],
        }).select("id email firstName lastName image color");

        return response.status(200).json({ contacts });
    } catch (error) {
        console.log({ error });
        return response.status(500).send("Internal Server Error");
    }
};

export const getMessages = async (request, response, next) => {
    try {
        const { recipientId } = request.params;
        const userId = request.userId;

        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: recipientId },
                { sender: recipientId, recipient: userId }
            ]
        })
        .populate("sender", "id email firstName lastName image color")
        .populate("recipient", "id email firstName lastName image color")
        .sort({ timestamp: 1 });

        return response.status(200).json({ messages });
    } catch (error) {
        console.log({ error });
        return response.status(500).send("Internal Server Error");
    }
};