const mongoose = require("mongoose");
const slugify = require("slugify");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
  },
  slugName: {
    type: String,
    lowercase: true,
  },
});

categorySchema.pre("save", async function () {
  if (this.isModified("name")) {
    this.slugName = slugify(this.name, { lower: true, strict: true });
  }
});

module.exports = mongoose.model("Category", categorySchema);
