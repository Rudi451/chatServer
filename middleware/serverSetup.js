import session from 'express-session';
import express, {Router} from 'express';
import cors from 'cors';

const router = new Router();

const sessionOptions = {
	secret: process.env.SECRET_KEY_SESSION_ID,
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: false,
		maxAge: 60 * 60 * 1000,
		expires: new Date(Date.now() + 3600000),
	},
	loggedIn: false,
};
//Cors
router.use(
	cors({
		origin: 'http://localhost:3000',
		credentials: true,
	})
);
// Session
router.use(session(sessionOptions));

export default router;
