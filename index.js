const express = require('express');
const app = express();
app.use(express.json());
const port = 3001;
const {createSale, createPurchase, users, deleteusers} = require("./types")
const {sale, inventory, user} = require("./db");
const cors = require("cors");
app.use(cors({}));
const { format } = require('date-fns');

app.post('/create', async function(req,res){
    const createPayload = req.body;
    const parsedPayload = createPurchase.safeParse(createPayload);
    if(!parsedPayload.success){
        res.status(411).json({
            msg: "Invalid Inputs"
        });
        return;
    }
   
    const filter = {
        product : createPayload.product
    };

    const existingProduct = await inventory.findOne(filter);
    
    try{
        let newAvgPrice = createPayload.avgprice; //needs to save these values if product not found
        let newQty = createPayload.qty;

    if(existingProduct){
        const currentAvgPrice = existingProduct.avgprice;
        const currentQty = existingProduct.qty;
        
        newAvgPrice = ((currentAvgPrice*currentQty)+(createPayload.avgprice * createPayload.qty))/(currentQty + createPayload.qty);
        newAvgPrice = parseFloat(newAvgPrice.toFixed(2));
        newQty = currentQty + createPayload.qty;
    }

    const update = {
        $set:{
            avgprice: newAvgPrice,
            qty: newQty
        },
        $setOnInsert: {
            product: createPayload.product,
        },        
    };

    const options = {upsert: true, returnOriginal: false}; //adds new document if product not found

        await inventory.findOneAndUpdate(filter, update, options);
        res.json({
            msg: "Inventory updated successfully"
        });
    }catch(err){
        res.status(500).json({
            msg: "Internal Server Error"
        })
    }    
});


app.post('/sales', async function(req,res){
    const createPayload = req.body;
    const parsedPayload = createSale.safeParse(createPayload);
    if(!parsedPayload.success){
        res.status(411).json({
            msg: "Invalid Inputs"
        });
        return;
    }

    const filter = {
        product: createPayload.product
    };

    const existingProduct = await inventory.findOne(filter);

    try{
        if(!existingProduct){
            res.status(411).json({
                msg: "Product Not Found"
                
            });
            alert("Stock not found");
            return;
        }
        let newQty = createPayload.qty;
        if(existingProduct.qty >= newQty){
        newQty = existingProduct.qty - newQty;

        const update = {
            qty: newQty
        };

        await inventory.findOneAndUpdate(filter, update);

        const today = new Date();
        const formatdate = format(today, 'dd-MM-yyyy')
    
        await sale.create({
            product: createPayload.product,
            purchase: existingProduct.avgprice,
            sales: createPayload.sales,
            profit: parseFloat((createPayload.sales - existingProduct.avgprice).toFixed(2)),
            qty: createPayload.qty,
            date: formatdate
        })

        res.json({
            msg: "Sales registered"
        });
    }else{
        alert("Inventory Shortage");
        res.json({
            msg: "Inventory Shortage"
        })
    }
    }catch(err){

    }
    return;
})

app.get('/inventory', async function(req,res){
    const list = await inventory.find({});

    const pricearr = list.map(item => item.avgprice);
    const qtyarr = list.map(item => item.qty);
    const nonzerostock = [{}];
    const highvalueinventory = [{}];
    const newarr2 = list.map(item => {
        if(item.qty * item.avgprice > 50000){
            highvalueinventory.push({
                product: item.product,
                qty: item.qty,
                avgprice: item.avgprice
            });
        }
    })
    const newarr = list.map(item => {
        if(item.qty!=0){
            nonzerostock.push({
                product: item.product,
                qty: item.qty,
                avgprice: item.avgprice
            });
        }
    })
    const qhtl = [...list];
    const phtl = [...list];
    const qtyhightolow = qhtl.sort((a,b)=> b.qty - a.qty);
    const pricehightolow =  phtl.sort((a,b)=>b.avgprice - a.avgprice);

    function Total(p, q){
        let x = p.length;
        let sum =0, product = 0;
        for(let k =0; k< x; k++){
            product = p[k]*q[k];
            sum = sum + product;
        }
        return sum;
    }
    const totalInventoryValue = Total(pricearr, qtyarr)

    res.json({
        list: list,
        totalInventoryValue: totalInventoryValue,
        nonzerostock: nonzerostock,
        qtyhightolow: qtyhightolow,
        pricehightolow: pricehightolow,
        highvalueinventory: highvalueinventory
    });
    return;
})

app.get('/salesregister', async function(req,res){
    const list = await sale.find({});
    let totsales, totprofit = 0;

    const aggregatedProducts = list.reduce((acc, item) => {
        if (!acc[item.product]) {
            acc[item.product] = {
                product: item.product,
                totalQty: 0,
                avgSales: 0,
                avgProfit: 0,
                purchase: item.purchase,
                
            };
        }

        acc[item.product].totalQty += item.qty;
        totsales = acc[item.product].avgSales;
        acc[item.product].avgProfit += (item.profit)*(item.qty);
        acc[item.product].avgSales = (((item.sales)*(item.qty)) + ((acc[item.product].totalQty - item.qty)*totsales))/acc[item.product].totalQty;
        return acc;
    }, {})


    const aggregatedSales = list.reduce((acc,item)=>{
        const month = item.date.split("-")[1]+"/"+item.date.split("-")[2];
        if(!acc[month]){
            acc[month]= {
                month: month,
                totalSales: 0
            };
        }
        acc[month].totalSales +=(item.sales)*(item.qty);
        return acc;
    },{})

    const aggregatedSalesArray = Object.values(aggregatedSales); 
    
    const aggregatedArray = Object.values(aggregatedProducts);
    const newarr = aggregatedArray.map(aggregatedArray =>{
        aggregatedArray.avgProfit = parseFloat(aggregatedArray.avgProfit).toFixed(2);
        aggregatedArray.avgSales = parseFloat(aggregatedArray.avgSales).toFixed(2);
    })
    const salehightolow = aggregatedArray.sort((a,b)=> b.totalQty - a.totalQty);

    res.json({
        list: list,
        aggregatedProducts: aggregatedProducts,
        salehightolow: salehightolow,
        aggregatedSalesArray: aggregatedSalesArray
    });
    return;
})

app.put('/deletesales', async function(req,res){
    const createPayload = req.body;
    const parsedPayload = deleteusers.safeParse(createPayload);

    if(!parsedPayload.success){
        res.status(411).json({
            msg: "Invalid Inputs"
        })
        return;
    }
    await sale.deleteOne({
        _id: createPayload._id 
    });
    res.json({
        msg: "Deleted Sales entry"
    });
})

app.post('/login', async function(req,res){
    const createPayload = req.body;
    const parsedPayload = users.safeParse(createPayload);
    if(!parsedPayload.success){
        res.status(411).json({
            msg: "Invalid Inputs",
            success: false
        });
        return;
    }

    const filter = {
        username: createPayload.username
    };

    const userInfo = await user.findOne(filter);

    if(userInfo!=null){

    if(userInfo.username == createPayload.username && userInfo.password == createPayload.password){
        res.json({
            msg: "Login Successful",
            success: true,
        });    
    }
    else{
        res.status(500).json({
            msg: "Invalid User Creds",
            success: false
        });       
    }
    }else{
        res.status(500).json({
            msg: "Invalid User Creds",
            success: false
        });
    }
});

app.listen(port);