const FriendRequest = require("../models/friendRequest");
const User = require("../models/user");
const filterObj = require("../utils/filterObj");

exports.updateMe = async (req, res, next) => {
    const filteredBody = filterObj(req.body, "firstName", "lastName", "about", "avatar");

    const userDoc = await User.findByIdAndUpdate(req.user._id, filteredBody);

    res.status(200).json({
        status: "success",
        data: userDoc,
        message: "User Updated successfully",
    });
};

exports.getUser = async (reg, res, next) => {
    const all_users = await User.find({ verified: true }).select("firstName lastName _id");

    const this_user = reg.user;

    const remaining_users = all_users.filter(
        (user) => !this_user.friends.includes(user_id) && user._id.toString() !== req.user._id.toString()
    );

    res.status(200).json({ status: "success", data: remaining_users, message: "Users found successfully!" });
};
