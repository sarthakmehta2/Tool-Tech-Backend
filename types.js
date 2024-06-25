const zod = require("zod");

const createSale = zod.object({
    product: zod.string().min(1),
    sales: zod.number().min(1),
    qty: zod.number().min(1)
});

const createPurchase = zod.object({
    product: zod.string().min(1),
    avgprice: zod.number().min(1),
    qty: zod.number().min(1)
});

const users = zod.object({
    username: zod.string().min(1),
    password: zod.string().min(1)
});

const deleteusers = zod.object({
    _id: zod.string().min(1)
})

module.exports = {
    createSale: createSale,
    createPurchase: createPurchase,
    users: users,
    deleteusers: deleteusers
}