import db from '../db/connections.js';
import {MongoClient, ObjectId} from 'mongodb';
import HttpError from '../helpers/HttpError.js';
import {sendAnswer} from '../helpers/sendAnswer.js';
/**__________________________________________________________________________________________________
 */
export const getAllChats = async (req, res, next) => {
	// let collection = await db.collection('chats').find();
	let collection = await db.collection('chats').find().toArray();

	res.send(collection).status(200);
};
/**__________________________________________________________________________________________________
 */
export const createChat = async (req, res, next) => {
	const {username1, username2} = req.query;
	//
	if (!username1 || !username2) {
		return next(new HttpError('Both usernames are required.', 400));
	}
	// check a chat between persons (username1 username2) is already exist
	// if yes -> error toast 'chat already exist'

	// if not -> new chat
	try {
		// Check if a chat between the two users already exists
		const existingChat = await db.collection('chats').findOne({
			$or: [
				{username1, username2},
				{username1: username2, username2: username1}, // Check both directions
			],
		});

		if (existingChat) {
			// Chat already exists -> send error response
			return next(new HttpError('Chat already exists', 409));
		}

		// Create a new chat
		const newChatData = {
			username1,
			username2,
			messages: [],
		};

		const result = await db.collection('chats').insertOne(newChatData);

		if (!result.acknowledged) {
			throw new Error('Failed to create chat.');
		}

		// console.log('req.query:', req.query);

		res.status(201).json({
			message: 'Chat created successfully.',
			chatId: result.insertedId,
		});
	} catch (err) {
		console.error(err);
		next(new HttpError('Creating chat failed, please try again later.', 500));
	}
};
/**__________________________________________________________________________________________________
 */
export const getChat = async (req, res, next) => {
	// require: chat id_
	// res.send -> object from db record with all messages history
	try {
		const {id} = req.query;
		// console.log('id is:', id);
		// Valid the ID
		if (!id || !ObjectId.isValid(id)) {
			next(new HttpError('Invalid or missing ID', 400));
		}

		// set connection to the database
		const chatsCollection = db.collection('chats');

		// Search for document with the corresponding ID
		const chat = await chatsCollection.findOne({
			_id: ObjectId.createFromHexString(id),
		});

		if (!chat) {
			next(new HttpError(' Chat not found ', 404));
		}

		//Successful response
		res.status(200).json(chat);
	} catch (error) {
		next(new HttpError('Internal server error', 500));
	}
};
/**__________________________________________________________________________________________________
 */
export const createMessage = async (req, res, next) => {
	const {from, to, message} = req.query;

	if (!from || !to || !message) {
		return next(
			new HttpError('Missing required parameters: from, to, or message', 400)
		);
	}

	try {
		const chatsCollection = db.collection('chats');

		// Suche nach einem existierenden Chat
		const existingChat = await chatsCollection.findOne({
			$or: [
				{username1: from, username2: to},
				{username1: to, username2: from}, // Beide Richtungen prüfen
			],
		});

		if (existingChat) {
			// Update den existierenden Chat mit einer neuen Nachricht
			console.log('existingChat id: ', existingChat._id);
			const result = await chatsCollection.updateOne(
				{_id: existingChat._id}, // Filter nach Chat-ID
				{
					$push: {
						messages: {
							from,
							message,
							created: new Date(),
						},
					},
				}
			);

			if (result.modifiedCount > 0) {
				sendAnswer(req, res, next, to, existingChat._id);
			} else {
				throw new Error('Failed to update the chat.');
			}
		} else {
			// Erstelle einen neuen Chat mit der ersten Nachricht
			const newChatData = {
				username1: from,
				username2: to,
				messages: [
					{
						from,
						message,
						created: new Date(),
					},
				],
			};

			const result = await chatsCollection.insertOne(newChatData);

			if (result.acknowledged) {
				sendAnswer(req, res, next, to, result._id);
			} else {
				throw new Error('Failed to create chat.');
			}
		}
	} catch (err) {
		console.error('Error updating chat:', err);
		next(new HttpError('Internal server error', 500));
	}
};
/**
 * update only main chat record and user record and keep
 * the old name is in the previous messages in the chats
 */

export const updateChatName = async (req, res, next) => {
	try {
		const {username, usernameNew} = req.query;
		console.log('username, usernameNew: ', username, usernameNew);

		if (!username || !usernameNew || username !== req.session.username) {
			return next(new HttpError('Invalid or missing parameters', 400));
		}
		//Update in the Chat collection
		const collection = db.collection('chats');
		const cursor = collection.find({});
		while (await cursor.hasNext()) {
			const document = await cursor.next();

			let updatedDocument = {...document};

			for (let key in updatedDocument) {
				if (updatedDocument[key] === username) {
					updatedDocument[key] = usernameNew;
				}
				await collection.updateOne(
					{_id: document._id},
					{$set: updatedDocument}
				);
			}
		}
		//Update in the users collection
		const userCollection = db.collection('users');
		const userCursor = userCollection.find({});

		while (await userCursor.hasNext()) {
			const document = await userCursor.next();

			let updatedDocument = {...document};

			for (let key in updatedDocument) {
				if (updatedDocument[key] === username) {
					updatedDocument[key] = usernameNew;
				}
				await userCollection.updateOne(
					{_id: document._id},
					{$set: updatedDocument}
				);
			}
		}
		//Update the session parameters
		req.session.username = usernameNew;
		// Respond with success
		res.status(200).json({message: 'Username updated successfully'});
	} catch (err) {
		console.error('Error updating chat name:', err);
		next(new HttpError('Internal server error', 500));
	}
};
/**__________________________________________________________________________________________________
 */
export const chatSearch = async (req, res, next) => {
	const {key} = req.query;

	if (!key) {
		next(new HttpError('Search key is required', 400));
	}

	console.log('search: ', key);
	try {
		// find the records with this params
		const collection = db.collection('chats');
		let response = [];
		const chats = await collection.find({}).toArray();

		//i want to look in the array chats[0].username1 or chats[0].username2 === search -> response.push({type: user, id: userID, username: username})
		// look in the chats[0].messages[i] => contain "word" -> response.push({type: message, chatid: id, from: username, date: createdAt})
		chats.forEach((chat) => {
			// Look in the messages
			chat.messages.forEach((message) => {
				if (message.message.includes(key)) {
					response.push({
						type: 'message',
						chatId: chat._id.toString(),
						from: message.from || message.username,
						date: message.created,
					});
				}
			});
		});
		// find the records in the users with this params
		const userCollection = db.collection('users');

		const users = await userCollection.find({}).toArray();

		// look in the users and if word found -> response.push({type: user, id: userID, username})
		users.forEach((user) => {
			// Suche nach dem Suchwort im Benutzernamen
			if (user.name.includes(key)) {
				response.push({
					type: 'user',
					id: user._id.toString(),
					username: user.name,
				});
			}
		});
		// successful response
		console.log('response: ', response);
		res.send(response);
	} catch (err) {
		console.log('Error during search: ', err);
		next(new HttpError('An error occurred during the search process.', 500));
	}
};
/**__________________________________________________________________________________________________
 */
export const updateChatMessage = async (req, res, next) => {
	const {oldText, newText, chatId, from} = req.query;
	if (
		!oldText ||
		!newText ||
		!chatId ||
		!from ||
		from !== req.session.username
	) {
		next(new HttpError('Parameters required', 402));
	}

	try {
		const collection = db.collection('chats');

		// look for the message
		const chat = await collection.findOne({
			_id: ObjectId.createFromHexString(chatId),
		});

		// Find and update the message
		const updatedMessages = chat.messages.map((message) => {
			if (message.from === from && message.message === oldText) {
				return {...message, message: newText};
			}
			return message;
		});

		// Update the chat document
		await collection.updateOne(
			{_id: ObjectId.createFromHexString(chatId)},
			{$set: {messages: updatedMessages}}
		);
		//successful response
		res.send({message: 'Message successful updated'});
	} catch (err) {
		next(new HttpError('Error with message update ', 500));
	}
};

/**__________________________________________________________________________________________________
 */

export const deleteChat = async (req, res, next) => {
	const {id} = req.params;
	// console.log('id to delete: ', id);
	if (!id) {
		return next(new HttpError('ID is required to delete a chat.', 400));
	}

	try {
		//Check whether the record exists
		const record = await db
			.collection('chats')
			.findOne({_id: ObjectId.createFromHexString(id)});

		if (!record) {
			return res.status(404).json({
				message: 'Chat not found.',
			});
		}

		//Delete the record
		const result = await db
			.collection('chats')
			.deleteOne({_id: ObjectId.createFromHexString(id)});

		if (result.deletedCount === 0) {
			throw new Error('Failed to delete the chat.');
		}

		res.status(200).json({
			message: 'Chat deleted successfully.',
			deletedId: id,
		});
	} catch (err) {
		console.error(err);
		next(new HttpError('Deleting chat failed, please try again later.', 500));
	}
};
