import db from '../db/connections.js';
import {MongoClient, ObjectId} from 'mongodb';
import HttpError from '../helpers/HttpError.js';

export const login = async (req, res, next) => {
	const {username} = req.query;

	if (!username) {
		next(new HttpError('Username is required.', 400));
	}

	try {
		const collection = db.collection('users');
		let user = await collection.findOne({name: username});

		if (!user) {
			// If the user does not exist, we create a new user
			user = {
				iconType: Math.floor(Math.random() * 11) + 1,
				name: username,
				createdAt: new Date(),
			};
			const result = await collection.insertOne(user);

			console.log(`Neuer Benutzer erstellt: ${username}`);
		} else {
			console.log(`Benutzer gefunden: ${username}`);
		}

		// Set the session to indicate that the user is logged in
		req.session.logged = true;
		req.session.username = username;

		res.status(200).send(`Successfully logged in as ${username}`);
		console.log('req.session.logged: ', req.session.logged);
	} catch (error) {
		console.error('Error logging in:', error);
		next(new HttpError('Server error', 500));
	}
};

//_____________________________________________________
//TODO:
// login via google
