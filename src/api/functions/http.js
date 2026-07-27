const throwHttpError = (status, message) => {
    throw new Error(message, {
        cause: {
            status,
            jsonBody: { error: message }
        }
    });
};

export { throwHttpError };
