import User from "../models/UserModel.js";
import Message from "../models/MessagesModel.js";
import { mongoose } from "mongoose";

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

export const getContactsForDMList = async (request, response, next) => {
    try {
        let { userId } = request;
        userId = new mongoose.Types.ObjectId(userId);

        const contacts = await Message.aggregate([
            {
                $match: {      
                    $or: [{ sender: userId }, { recipient: userId }],
                },
            },
            {
                $sort: { timestamp: -1},
            },
            {
                $group: {
                    _id: {
                        $cond: {
                            if: { $eq: ["$sender", userId] },
                            then: "$recipient",
                            else: "$sender",
                        },
                    },
                    lastMessageAt: { $first: "$timestamp" },
                    lastMessageText: { $first: "$text" },
                },
            },
            {
            $lookup:{
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "contactInfo",
            },
            },
            {
                $unwind: "$contactInfo",
            },
            {
                $project: {
                    _id: 1,
                    lastMessageAt: 1,
                    lastMessageText: 1,
                    email: "$contactInfo.email",
                    firstName: "$contactInfo.firstName",
                    lastName: "$contactInfo.lastName",
                    image: "$contactInfo.image",
                    color: "$contactInfo.color",
                },
            },{
                $sort: {lastMessageAt: -1},
            },
        ]);
        
        return response.status(200).json({ contacts });

    } catch (error) {
        console.log({ error });
        return response.status(500).send("Internal Server Error");
    }
};

export const getAllContacts = async (request, response, next) => {
    try {
        const users = await User.find(
            { _id: { $ne: request.userId } },
            "firstName lastName _id"
        );

        const contacts = users.map((user) => ({
            label: user.firstName ?`${user.firstName} ${user.lastName}` : user.email,
            value: user._id,
        }));

        return response.status(200).json({ contacts });
    } catch (error) {
        console.log({ error });
        return response.status(500).send("Internal Server Error");
    }
};