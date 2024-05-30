const User = require("../models/user");

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