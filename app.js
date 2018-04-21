var express     = require("express"),
mongoose    = require("mongoose"),
bodyParser  = require("body-parser"),
app         = express(),
path = require('path'),
LocalStrategy = require("passport-local"),
methodOverride = require("method-override"),
Campsite  = require("./models/campsite"),
Comment     = require("./models/comment"),
passport    = require("passport"),
moment = require("moment"),
User        = require("./models/user");


app.locals.moment = moment;  //Used for timestamps
var indexRoutes = require("./index");

//Initializing express session
app.use(require("express-session")({
	secret: "HiddenCampers rock!!",
	resave: false,
	saveUninitialized: false
}));

//Passport Initialization
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//Initializing user
app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	next();
});

//Database Connection
mongoose.connect("mongodb://sarthak:hiddencampers@ds117749.mlab.com:17749/hiddencampersdb");

// Express commands for viewing pages
app.use (bodyParser.urlencoded({extended : true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.set('views', path.join(__dirname, '/public'));

app.use(indexRoutes);

//Starting the app on port 3000 on local machine
app.listen(process.env.PORT || 3000, process.env.IP, function(){
	console.log ("Server started!");
});