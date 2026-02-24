const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      trim: true,
      required: function () {
        return this.role === "buyer";
      },
    },
    lastname: {
      type: String,
      trim: true,
      required: function () {
        return this.role === "buyer";
      },
    },
    name: {
      type: String,
      trim: true,
      required: function () {
        return this.role === "seller";
      },
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["buyer", "seller"],
      default: "buyer",
    },

    // If the User is Buyer
    email: {
      type: String,
      unique: true,
      sparse: true,
      required: function () {
        return this.role === "buyer";
      },
    },
    addresses: {
      type: [
        {
          city: String,
          street: String,
          buildingNo: String,
        },
      ],
      default: function () {
        if (this.role === "buyer") {
          return [];
        }
        return undefined;
      },
    },

    // If the User is Seller
    sellingOffline: {
      type: Boolean,
      required: function () {
        return this.role === "seller";
      },
    },
    sellingOnline: {
      type: Boolean,
      required: function () {
        return this.role === "seller";
      },
    },
    // salesChannel: {
    //   type: String,
    //   enum: ["online", "offline", "both"],
    //   required: function () {
    //     return this.role === "seller";
    //   },
    // },
    shopAddress: {
      type: String,
      required: function () {
        return this.role === "seller" && this.sellingOffline;
      },
      //default: undefined,
    },
    websiteLink: {
      type: String,
      required: function () {
        return this.role === "seller" && this.sellingOnline;
      },
      //default: undefined,
    },
    uploadedPhotos: {
      type: [String],
      required: function () {
        return this.role === "seller";
      },
      default: undefined,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: function () {
        if (this.role === "seller") {
          return "pending";
        }
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
