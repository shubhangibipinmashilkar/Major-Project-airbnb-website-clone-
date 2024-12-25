const express =  require("express");
const app = express();
const path =require('path');
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const data = require("./init/data.js")
const methodOverride = require('method-override');
const engine = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema } = require("./schema.js");
const { reviewSchema } = require("./schema.js");
const Review = require("./models/review.js");
// const Joi = require('joi');

app.use(methodOverride('_method'));


app.set("views",path.join(__dirname,"/views/listings"));
//app.set("views",path.join(__dirname,"views"));
app.set("view engine","ejs");

app.use(express.static(path.join(__dirname,"/public")));
app.use(express.urlencoded({extended:true}));
app.engine("ejs",engine);

main().then(()=>{
    console.log("mongoDB connection successful!");
}).catch((err)=>{
    console.log(err);
})

async function main(){
 await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");
}



//reviews

app.post("/listings/:_id/reviews",wrapAsync(async(req,res)=>{
    
    let { _id } = req.params;
    let listing = await Listing.findById(_id);
    
    //let listing = await Listing.findById(req.params.id);
    
    let newReview = new Review(req.body.review);
    listing.reviews.push(newReview);
    await listing.save();
    await newReview.save();
    console.log("new review saved!");
res.send("new review saved!");

}));


//DELETE Listing
app.delete("/listings/:_id",wrapAsync(async(req,res)=>{
    let { _id } = req.params;
    let listing = await Listing.findByIdAndDelete(_id);
    // res.redirect("/listings");
    res.redirect("/listings");
}));



//NEW Listing
app.get("/listings/new",(req,res)=>{
    res.render("new.ejs");
})

//CREATE NEW listing
app.post("/listings", wrapAsync(async (req,res,next)=>{
    
    let result = listingSchema.validate(req.body);
    console.log(result);

    let {title:title} = req.body;
    let {description:description} = req.body;
    let {image:image} = req.body;
    let {price:price} = req.body;
    let {location:location} = req.body;
    let {country:country} = req.body;
    // if(!req.body.title || !req.body.description || !req.body.image || !req.body.price || !req.body.location || !req.body.country){
    //     throw new ExpressError(400,"Bad Request.. Some data is missing...! ");
    // } //instead of this we can use "joi" server side validation
        let listing = new Listing({
        title: title,
        description: description,
        image: image,
        price: price,
        location: location,
        country: country
    })
    
    await listing.save();
    
    //console.log(listing);
   res.redirect("/listings");
    //console.log(listing);
}));

//EDIT Listing
app.get("/listings/:_id/edit",wrapAsync(async(req,res)=>{
    let { _id } = req.params;
    let listing = await Listing.findById(_id);
    res.render("edit.ejs",{listing});
}));

//UPDATE Listing
app.put("/listings/:id",wrapAsync(async(req,res)=>{
    let { _id } = req.params;
    let {title,description,image,price,location,country}=req.body;
    if(!req.body.title || !req.body.description || !req.body.image || !req.body.price || !req.body.location || !req.body.country){
        throw new ExpressError(400,"Bad Request!");
    }
    await Listing.updateOne({
        title:title,
        description:description,
        image:image,
        price:price,
        location:location,
        country:country,
    });
    res.redirect("/listings");
}));



//SHOW ALL LISTINGS
app.get("/listings",wrapAsync(async (req,res)=>{
    let listings = await Listing.find({});
    res.render("index.ejs",{listings});
}));


//SHOW INDIVIDUAL LISTING
app.get("/listings/:_id",wrapAsync(async(req,res)=>{
    let { _id }  = req.params;
    let listing = await Listing.findById(_id);
    res.render("show.ejs",{listing});
}));

app.get("/",(req,res)=>{
    res.send("This is root API..");
});

app.all("*",(req,res,next)=>{
    
    next(new ExpressError(404,"PAGE NOT FOUND!"));
})

app.use((err,req,res,next)=>{
    let { statusCode = 500, message = "some error occured" } = err;
    res.status(statusCode).render("error.ejs",{ err });
    //res.status(statusCode).send(message);
})

app.listen(8080,()=>{
    console.log("server is running on port 8080");
})