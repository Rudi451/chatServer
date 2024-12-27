export default class HttpError extends Error {
	constructor(message, errorCode) {
		super(message);
		this.errorCode = errorCode;

		// Behalte den Stack-Trace für die ursprüngliche Fehlerstelle
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, HttpError);
		}
	}
}
