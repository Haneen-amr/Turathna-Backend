const express = require("express");
const router = express.Router();

const {
  postReservation,
  getAllMyReservations,
  getAllReservations,
  cancelReservation,
} = require("../controllers/reservationController");

const { protect, restrictTo, isOwner } = require("../middlewares/AuthMW");

router.post("/:workshopId", protect, restrictTo("buyer"), postReservation);

router.get(
  "/seller/:id",
  protect,
  isOwner,
  restrictTo("seller"),
  getAllMyReservations,
);

router.get("/", protect, restrictTo("buyer", "admin"), getAllReservations);

router.delete(
  "/:reservationId",
  protect,
  restrictTo("buyer"),
  cancelReservation,
);

module.exports = router;
