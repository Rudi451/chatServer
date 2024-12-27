import express from 'express';
import db from '../db/connections.js';
import HttpError from '../helpers/HttpError.js';

import {
	createChat,
	getAllChats,
	createMessage,
	deleteChat,
	chatSearch,
	getChat,
	updateChatName,
	updateChatMessage,
} from '../controllers/chat-controller.js';
import {login} from '../controllers/user-controller.js';
import {isLogged} from '../middleware/isLogged.js';

const router = express.Router();

// Get collections list
router.get('/', isLogged, async (req, res) => {
	let collection = await db.listCollections().toArray();

	res.send(collection).status(200);
});
//___________________________________________________________
//// Chats Routes

router.get('/chats', isLogged, getAllChats);

router.get('/chat', isLogged, getChat);

router.get('/chats/search', isLogged, chatSearch);

router.post('/chats/new', isLogged, createChat);

router.post('/chats/new/message', isLogged, createMessage);

router.post('/chats/login', login);

router.put('/chats/update/name', isLogged, updateChatName);

router.put('/chats/update/message', isLogged, updateChatMessage);

router.delete('/chats/delete/:id', isLogged, deleteChat);

export default router;
