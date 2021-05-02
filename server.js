require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const cookieParser = require("cookie-parser");
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(
	cors({
		origin: "https://dbnotes-db.netlify.app",
		methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
		credentials: true,
	})
);

app.use(cookieParser(process.env.SESSION_SECRET));

app.use(express.json());
app.set("trust proxy", 1);
app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: true,
		saveUninitialized: true,
		cookie: {
			secure: true,
			maxAge: 24 * 60 * 60 * 1000,
			sameSite: "none",
		},
	})
);

app.use(passport.initialize());
app.use(passport.session());

// LOCAL TESTINNG
// mongoose.connect("mongodb://localhost:27017/DBNotes", {
// 	useNewUrlParser: true,
// 	useUnifiedTopology: true,
// 	useCreateIndex: true,
// });

mongoose.connect(process.env.DATABASE_URL, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useCreateIndex: true,
	useFindAndModify: false,
});

const userSchema = new mongoose.Schema({
	name: String,
	email: String,
	googleId: String,
	avatar: String,
	notes: [
		{
			noteId: String,
			title: String,
			content: String,
		},
	],
});

userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.serializeUser(function (user, done) {
	done(null, user.id);
});

passport.deserializeUser(function (id, done) {
	User.findById(id, function (err, user) {
		done(err, user);
	});
});

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.CLIENT_ID,
			clientSecret: process.env.CLIENT_SECRET,
			callbackURL: "https://mydb-notes.herokuapp.com/auth/google/home",
		},
		function (accessToken, refreshToken, profile, cb) {
			User.findOrCreate(
				{
					googleId: profile.id,
					email: profile.emails[0].value,
					name: profile.displayName,
					avatar: profile.photos[0].value,
				},
				function (err, user) {
					return cb(err, user);
				}
			);
		}
	)
);

app.post("/auth/user", (req, res) => {
	res.send(req.user);
	console.log("post", req.user);
});

app.get("/auth/user", (req, res) => {
	res.send(req.user);
	console.log("get", req.user);
});

app.get(
	"/auth/google",
	passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
	"/auth/google/home",
	passport.authenticate("google", { failureRedirect: "/" }),
	function (req, res) {
		res.redirect("https://dbnotes-db.netlify.app");
	}
);

app.get("/auth/logout", (req, res) => {
	if (req.user) {
		req.logout();
		res.send("success");
	}
});

app.post("/createnote", (req, res) => {
	const newNote = {
		noteId: req.body.noteId,
		title: req.body.title,
		content: req.body.content,
	};

	res.status(200).send();
	res.status(201).send();

	User.findOneAndUpdate(
		{ googleId: req.body.googleId },
		{ $push: { notes: newNote } },
		(err, doc) => {
			if (err) {
				console.log(err);
			}
		}
	);
});

app.post("/deletenote", (req, res) => {
	res.status(200).send();
	res.status(201).send();

	User.findOneAndUpdate(
		{ googleId: req.body.googleId },
		{ $pull: { notes: { noteId: req.body.noteId } } },
		(err, doc) => {
			if (err) {
				console.log(err);
			}
		}
	);
});

app.listen(process.env.PORT || 5000, (req, res) => {
	console.log("Connected to server");
});
