const User = require("../models/user");
const FriendRequest = require("../models/friendRequest");
const catchAsync = require("../utils/catchAsync");



exports.updateMe = async () => {

  const {user} = req;

  const filterBody = filterObj(req.body, "firstName", "lastName", "about", "avatar");

  const updated_user = await User.findByIdAndUpdate(
    user._id,
    filterBody,
    {
      new: true,
      runValidators: true,
      validateModifiedOnly: true,
    },
  );

  res.status(200).json({ status: "success", message: "Profile Updated Successfully" ,data: { user: updated_user } });
}


exports.getUsers = catchAsync(async (req, res, next) => {
  const all_users = await User.find({
    verified: true,
  }).select("firstName lastName _id status");

  const this_user = req.user;

  const remaining_users = all_users.filter(
    (user) =>
      !this_user.friends.includes(user._id) &&
      user._id.toString() !== req.user._id.toString()
  );

  res.status(200).json({
    status: "success",
    data: remaining_users,
    message: "Users found successfully!",
  });
});


// get requests where a user is a recipient
exports.getRequests = catchAsync(async (req, res, next) => {
  const requests = await FriendRequest.find({ recipient: req.user._id })
    .populate("sender")
    .select("_id firstName lastName status");

  res.status(200).json({
    status: "success",
    data: requests,
    message: "Requests found successfully!",
  });
});


// get friends for this user
exports.getFriends = catchAsync(async (req, res, next) => {
  const this_user = await User.findById(req.user._id).populate(
    "friends",
    "_id firstName lastName status"
  );
  res.status(200).json({
    status: "success",
    data: this_user.friends,
    message: "Friends found successfully!",
  });
});

