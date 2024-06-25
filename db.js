const mongoose = require("mongoose");
require('dotenv').config({path: "../.env"});


const MONGOURI = process.env.MONGO_URI;
console.log(process.env.MONGO_URI);

// mongoose.connect("mongodb+srv://mehtasarthak2:UyXpqDokZPWfmmku@cluster0.pmhujc1.mongodb.net/");

mongoose.connect(MONGOURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });


const salesSchema = new mongoose.Schema({
    product: String,
    sales: Number,
    profit: Number,
    qty: Number,
    purchase: Number,
    date: String
});

const inventorySchema = new mongoose.Schema({
    product: String,
    qty: Number,
    avgprice: Number,
});

const userSchema = new mongoose.Schema({
    username: String,
    password: String
});


const sale = mongoose.model('sale', salesSchema);
const inventory = mongoose.model('inventory', inventorySchema);
const user = mongoose.model('user', userSchema);

module.exports = {
    sale: sale,
    inventory: inventory,
    user: user
}
