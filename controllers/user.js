const FriendRequest = require("../models/friendRequest");
const User = require("../models/user");
const filterObj = require("../utils/filterObj");


exports.updateMe = async (req, res, next) => {
  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "about",
    "avatar"
  );
