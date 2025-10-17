const express = require("express");
const controller = require("../controllers/work");
const authMiddleware = require("../middleware/authentication");
const router = express.Router();

router.get("/", authMiddleware, controller.getWorks);

router.post("/", authMiddleware, controller.addWork);

router.patch("/:workId/complete", authMiddleware, controller.completeWork);

module.exports = router;
