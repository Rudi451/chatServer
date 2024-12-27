import axios from 'axios';
import * as dotenv from 'dotenv';

import db from '../db/connections.js';
import HttpError from './HttpError.js';

dotenv.config();

/**
 * Sends a random quote as a response in a chat conversation and write this in the database
 *
 * @param {request} req
 * @param {response} res
 * @param {nextFunction} next
 *
 * @throws {HttpError} If there's an error fetching the quote or writing to the database.
 */
export const sendAnswer = async (req, res, next, username, chatID) => {
	setTimeout(async () => {
		//function
		//set headers -> API Key
		// get quote -> send
		try {
			// set new Header
			const response = await axios.get('https://api.api-ninjas.com/v1/quotes', {
				headers: {
					'X-Api-Key': process.env.QUOTE_API_KEY,
				},
			});

			//check if the answer contains data and get the first quote
			if (response.data && response.data.length > 0) {
				const quote = response.data[0].quote;
				console.log('chatID:', chatID);
				const {from, to, message} = req.query;

				//write quote in the database
				const chatsCollection = db.collection('chats');

				// Search for the record
				//change from:to so, username2 is sending answer
				const result = await chatsCollection.updateOne(
					{_id: chatID}, // Filter with Chat-ID
					{
						$push: {
							messages: {
								from: username,
								message: quote,
								created: new Date(),
							},
						},
					}
				);
				// result.matchedCount > 0
				// 	? res.send(quote) //send quote to the frontend as answer
				// 	: next(new HttpError('Writing quote in the database error', 500));
				res.send(quote);
			} else {
				console.log('error with quote request');
				throw new Error('Error with quote request ');
			}
		} catch (error) {
			console.log('Error fetching quote:', error);
			next(new HttpError('Error with quote request ', 500));
		}
	}, 3000);
};
