/**
 * Central Error Handler
 *
 * if an error object comes as the first parameter, this middleware is executed
 *
 */
export const CentralErrorHandler = (error, req, res, next) => {
	//if a server header has already been set (e.g. a status code or .send or .json etc. is used)
	if (res.headerSent) {
		return next(error);
	}
	res.status(error.errorCode ?? 500);
	res.json({
		message: error.message ?? 'Unknown server error',
	});
};
