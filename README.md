## Description
Implementation of a test task for a job application.

### Test task:
Should use:
- NestJS Framework
- MongoDB
- RabbitMQ

REST app should consist of:

- **POST /api/users**
  Stores the user entry in db. After the creation, send an email and RabbitMQ event. Email can be dummy sending (no consumer needed).

- **GET /api/user/{userId}**
	Returns a user in JSON representation.

- **GET /api/user/{userId}/avatar**
	Retrieves image by 'avatar' field. Returns its base64-encoded representation.

	On the first request it should save the image as a plain file, create a MongoDB entry with userId and hash.

	On following requests should return the previously saved file.

- **DELETE /api/user/{userId}/avatar**
	Removes the file from the file system and the stored entry from db.

Should cover code with unit and e2e tests.

## Installation
```bash
$ npm install
```

## Running the app
```bash
$ npm run start
```
You should configure URIs for MongoDB and RabbitMQ in `.env` file.

## Test
```bash
# unit tests

$ npm run test


# e2e tests

$ npm run test:e2e
```
For e2e tests, you need to have running instances of MongoDB and RabbitMQ, and you need to configure the URIs in `.env.test` file.

There is also a _Postman_ collection to help with manual testing.
