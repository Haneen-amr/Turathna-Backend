require("dotenv").config();
const mongoose = require("mongoose");
const Region = require("../models/regionModel");
const Category = require("../models/categoryModel");

const regions = [
  { name: "Sinai" },
  { name: "Nubia" },
  { name: "Siwa Oasis" },
  { name: "Upper Egypt" },
  { name: "Fayoum" },
];

const categories = [
  { name: "Textiles & Embroidery" },
  { name: "Pottery & Ceramics" },
  { name: "Jewelry & Accessories" },
  { name: "Home Décor" },
  { name: "Bags & Leather Goods" },
  { name: "Wood & Carved Art" },
  { name: "Handmade Gifts" },
  { name: "Art & Paintings" },
];

async function seedDB() {
  try {
    await mongoose.connect(process.env.DB_URI);
    await Region.deleteMany();
    await Category.deleteMany();
    await Region.create(regions);
    console.log("Regions seeded successfully!");
    await Category.create(categories);
    console.log("Categories seeded successfully!");
  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    //Always close the connection when done
    mongoose.connection.close();
  }
}

seedDB();
