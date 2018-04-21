var express = require("express");
var router = express.Router();
var passport = require("passport");
var Campsite = require ("./models/campsite");
var Comment = require ("./models/comment");
var User = require("./models/user");

//Get request for the homepage
router.get("/", function(req,res){
	let noMatch = null;
	if (!req.query.search) {
    // Finding all campsites from the database
    Campsite.find({}, function(err, allCampsites) {
    	camp = { 
    		campsites: allCampsites,
    		page: "campsites"
    	}
    	res.render("campsite-index", camp);  
    });
}
else {
	Campsite.find({location: new RegExp(escapeRegex(req.query.search), 'gi')},
		function(err, allCampsites) {
			camp = { 
				campsites: allCampsites,
				page: "campsites"
			}
			res.render("campsite-index", camp);  

		});
}
}); 


// GET request for Logging in
router.get("/login", function(req,res){
	res.render("login");
});

//GET request for registering a new user
router.get("/register", function(req, res){
	res.render("register");
});

// POST request for Logging in
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => { //Local authentication by passport
    if (!user) { //If user not found
    	return res.redirect("/login");
    }
    req.logIn(user, err => { //Once user is found
    	let redirectTo = req.session.redirectTo ? req.session.redirectTo : '/campsites';
    	delete req.session.redirectTo;
    	res.redirect(redirectTo);
    });
})(req, res, next);
});


//POST request for registering a new user
router.post("/register", function(req, res){
	var newUser = new User({
		firstName : req.body.firstName ,
		lastName : req.body.lastName,
		email : req.body.email,
		username: req.body.username});

	User.register(newUser, req.body.password, function(err, user){
		
		passport.authenticate("local")(req, res, function(){ //Passport local authentication
			res.redirect("/campsites"); 
		});
	});
});


//GET request for logging out
router.get("/logout", function(req, res){
	req.logout();
	res.redirect("/campsites");
});

//Uploading image
//Attribution : https://stackoverflow.com/questions/35635165/upload-images-to-node-js-using-multer-doesnt-work
var multer = require('multer');
var storage = multer.diskStorage({
	filename: function(req, file, callback) {
		callback(null, Date.now() + file.originalname);
	}
});

var imageFilter = function (req, file, cb) {
	if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) { //Only supported formats
		return cb(new Error('Only image files are allowed!'), false); //If any other format, it throws an error
	}
	cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary'); //Cloudinary is used to host images online once uploaded
cloudinary.config({ 
	cloud_name: 'hiddencampers', 
	api_key: 311281915568112, 
	api_secret: "EWWuFEZzy5wRLW-T4KszRouxdxg"
});


//GET request for viewing list of campsites on homepage
router.get("/campsites", function(req,res){
	let noMatch = null;
	if (!req.query.search) {
    // Finding all campsites from the database
    Campsite.find({}, function(err, allCampsites) {
    	camp = { 
    		campsites: allCampsites,
    		page: "campsites"
    	}
    	res.render("campsite-index", camp);  
    });
}
else {
	Campsite.find({location: new RegExp(escapeRegex(req.query.search), 'gi')}, function(err, allCampsites) {
		camp = { 
			campsites: allCampsites,
			page: "campsites"
		}
		res.render("campsite-index", camp);  

	});
}
}); 

//GET request for adding a campsite
router.get("/campsites/add", isLoggedIn, function(req,res){
	if(isLoggedIn) {
		res.render("campsite-new");
	}
	else {
		res.render("/login");
	}
	
});

//POST request for adding a campsite
router.post("/campsites", isLoggedIn, upload.single('image'), function(req, res) {
	cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
		var newImage = result.secure_url;
		var newImageId = result.public_id;
		var campName = req.body.campsite.name;
		var campDesc = req.body.campsite.description;
		var campLoc = req.body.campsite.location;
		var campFeatures = req.body.campsite.features;
		var campActivities = req.body.campsite.activities;

		campsite.name = campName;
		campsite.description = campDesc;
		campsite.image = newImage;
		campsite.imageId = newImageId;
		campsite.author = {
			id: req.user._id,
			username: req.user.username
		}
		campsite.location = campLoc;
		campsite.features = campFeatures;
		campsite.activities = campActivities;

		Campsite.create(req.body.campsite, function(err, campsite) {
			if (err) {
				return res.redirect('back');
			}
			res.redirect('/campsites/' + campsite.id);
		});
	});
});

// GET request for viewing a campsite
router.get("/campsites/:id", function(req,res){
	Campsite.findById(req.params.id)
	.populate("comments")
	.exec(function(err, foundCampsite){
		camp = {
			campsite : foundCampsite
		};
		res.render("campsite-show", camp);
	});
});

// GET request for editing a campsite
router.get("/campsites/:id/edit", campsiteAuth,  function(req, res){
	Campsite.findById(req.params.id, function(err, foundCampsite){
		camp = {
			campsite : foundCampsite
		};
		res.render("campsite-edit", camp);
	});
});


//PUT request for editing a campsite
router.put("/campsites/:id", upload.single('image'), function(req, res){
	Campsite.findById(req.params.id, async function(err, campsite){

		var campsiteName = req.body.campsite.name;
		var campsiteDescription = req.body.campsite.description;
		var campsiteLocation = req.body.campsite.location;
		var campsiteFeaturs = req.body.campsite.features;
		var campsiteActivities = req.body.campsite.activities;

		if (req.file) {
			await cloudinary.v2.uploader.destroy(campsite.imageId);
			var result = await cloudinary.v2.uploader.upload(req.file.path);
			var newId = result.public_id;
			var newImage = result.secure_url;
		}

		campsite.name = campsiteName;
		campsite.description = campsiteDescription;
		campsite.location = campsiteLocation;
		campsite.features = campsiteFeaturs;
		campsite.activities = campsiteActivities;
		campsite.save();
		res.redirect("/campsites/" + campsite._id);
		
	});
});

//DELETE request for deleting a campsite
router.delete('/campsites/:id', function(req, res) {
	Campsite.findById(req.params.id, async function(err, campsite) {
		if(campsite){
			await cloudinary.v2.uploader.destroy(campsite.imageId);
			campsite.remove();
			res.redirect('/campsites');
		} else {
			if(err) {
				return res.redirect("back");
			}
		}
	});
});

//Attribution : https://stackoverflow.com/questions/432493/how-do-you-access-the-matched-groups-in-a-javascript-regular-expression
//				https://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
//Search helper function
function escapeRegex(text) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};




//***************** Comments ********************
//GET request for viewing a comment
router.get("/campsites/:id/comments/new", isLoggedIn, function(req,res){
	Campsite.findById(req.params.id, function(err, foundCampsite){
		camp = {
			campsite : foundCampsite
		};
		res.render("comment-new", camp);
		
	})
});


//POST request for viewing a comment
router.post("/campsites/:id/comments/", isLoggedIn, function(req, res){
	Campsite.findById(req.params.id, function(err, campsite){
		var campsiteName = req.body.campsite.name;
		var campsiteDescription = req.body.campsite.description;
		var campsiteLocation = req.body.campsite.location;
		var campsiteFeaturs = req.body.campsite.features;
		var campsiteActivities = req.body.campsite.activities;
		Comment.create(req.body.comment, function(err, comment){
			var getAuthorId = req.user._id;
			var getAuthorUsername = req.user.username;
			comment.author.id = getAuthorId;
			comment.author.username = getAuthorUsername
			comment.save();
			campsite.name = campsiteName;
			campsite.description = campsiteDescription;
			campsite.location = campsiteLocation;
			campsite.features = campsiteFeaturs;
			campsite.activities = campsiteActivities;
			campsite.comments.push(comment);
			campsite.save();
			res.redirect("/campsites/" + campsite._id);
		});
	
	});
});


//GET request for editing a comment
router.get("/campsites/:id/comments/:comment_id/edit", commentAuth , function(req, res){
	Comment.findById(req.params.comment_id, function(err, foundComment){
		camp = {
			campsite_id : req.params.id,
			comment: foundComment
		};
		res.render("comment-edit", camp);
	});
});


//PUT request for editing a comment
router.put("/campsites/:id/comments/:comment_id", commentAuth, function(req, res){
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
		res.redirect("/campsites/" + req.params.id);
		
	});
});

//DELETE request for deleting a comment
router.delete("/campsites/:id/comments/:comment_id", commentAuth,  function(req, res){
	Comment.findByIdAndRemove(req.params.comment_id, function(err){
		res.redirect("/campsites/" + req.params.id);
	});
});


//GET request to find the user
router.get("/user/:id", function(req,res){
	User.findById(req.params.id)
	.exec(function(err, foundUser){
		Campsite.find().where("author.id").equals(foundUser._id).exec((err, allCampsites) => {
			camp = {
				campsites : allCampsites,
				user : foundUser
			};
			res.render("userProfile", camp);
		});
		
	});
});


//Authentication to verify if the comment's owner is the user
function commentAuth(req, res, next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.comment_id, function(err, foundComment){
			if(foundComment.author.id.equals(req.user._id)) {
				next();
			} 
		});
	} else {
		res.redirect("back");
	}
}

//Authentication to verify if the user is a campsite's owner
function campsiteAuth(req, res, next){
	if(req.isAuthenticated()){
		Campsite.findById(req.params.id, function(err, foundCampsite){
			if(foundCampsite.author.id.equals(req.user._id)) {
				next();
			} 
		});
	} else {
		res.redirect("back");
	}
}


//Authentication to verify if the user is logged in
function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	else {
		res.redirect("/login");
	}
}

module.exports = router;