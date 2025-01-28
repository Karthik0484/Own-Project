import User from "../models/UserModel.js";


export const searchContacts = async (request, response, next) => {
    try{
    const {searchTerm} = request.body;

    if(searchTerm === undefined || searchTerm === null){
        return response.status(400).send("searchTerm is required.");
    }

    const sanitizedSearchTerm = searchTerm.replace(
        /[.*+?^${}|[\]\\]/g,"\\$&"
    );

    const regex = new RegExp(sanitizedSearchTerm, "i");


    // To Exclude Current loggedin User in search bar.
    const contacts = await User.find({
        $and: [{ _id: { $ne: request.userId } },
            {
                $or: [{ firstName: regex }, {lastName: regex}, { email: regex }],
            },
        ],
    });

    return response.status(200).json({ contacts });

    return response.status(200).send("Logout successfull."); 
  } catch(error) {
        console.log({ error });
        return response.status(500).send("Internal Server Error");
    }
};