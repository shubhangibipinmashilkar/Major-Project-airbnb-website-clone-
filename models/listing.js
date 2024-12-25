const mongoose = require("mongoose");

const Review = require("./review.js");

const listingSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
    },
    image:{
        type:String,
        default:"https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cGxlYXNhbnQlMjBwaWN0dXJlcyUyMG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D",
            set:(v) => v === "" ?
            "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cGxlYXNhbnQlMjBwaWN0dXJlcyUyMG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D"
            :v,
    },
    price:{
        type:Number,
    },
    location:{
        type:String,
    },
    country:{
        type:String,
    },
    reviews:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Review",
    }]
});

const Listing = mongoose.model("Listing",listingSchema);

module.exports = Listing;