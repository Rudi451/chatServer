import HttpError from '../helpers/HttpError.js';

export const isLogged = (req, es, next) => {
	if (req.session && req.session.logged === true) {
		next();
	} else {
		if (!req.session.logged) {
			console.log('There are any req.session.logged variable');
		} else {
			console.log('actual req.session.logged: ', req.session.logged);
		}
		next(new HttpError('Error: You are not logged', 400));
	}
};
