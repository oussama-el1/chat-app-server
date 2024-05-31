const router = require("express").Router();

const userController = require("../controllers/user");
const authController = require("../controllers/auth");

router.patch("/update-me", authController.protect, userController.updateMe);
router.post("/get-users", authController.protect, userController.getUsers);
router.post("/get-friends-requests", authController.protect, userController.getRequests);
router.patch("/get-friends", authController.protect, userController.getFriends);



module.exports = router