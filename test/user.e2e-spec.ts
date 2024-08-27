import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { RabbitMQService } from '../src/rabbitmq/rabbitmq.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../src/user/user.model';
import { Model } from 'mongoose';
import { GetMessage } from 'amqplib';
import { setupApp } from '../src/app-setup';
import { Avatar } from '../src/user/avatar/avatar.model';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  let rabbitMQService: RabbitMQService;
  let userModel: Model<User>;
  let avatarModel: Model<Avatar>;
  let imageServer: Server;

  beforeAll(async () => {
    // Create a simple HTTP server to serve an image
    imageServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      if (req.url === '/test-image.jpg') {
        const imagePath = path.resolve(__dirname, './test-image.jpg');
        const image = await fs.readFile(imagePath);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(image);
      } else {
        res.writeHead(404);
        res.end();
      }
    });
  
    await new Promise<void>((resolve) => {
      imageServer.listen(3001, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => imageServer.close(() => resolve()));
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();

    mongoConnection = moduleFixture.get<Connection>(getConnectionToken());
    rabbitMQService = moduleFixture.get<RabbitMQService>(RabbitMQService);
    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    avatarModel = moduleFixture.get<Model<Avatar>>(getModelToken(Avatar.name));
  });

  afterEach(async () => {
    await mongoConnection.dropDatabase();
    await rabbitMQService.purgeQueue('user_created');
    await app.close();
  });

  describe('/api/users (POST)', () => {
    it('should create a user, persist in DB, and send RabbitMQ message', async () => {
      const userData = { email: 'test@example.com', avatar: 'https://example.com/avatar.jpg' };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.email).toBe(userData.email);
      expect(response.body.avatar).toBe(userData.avatar);

      // Check if user is persisted in the database
      const userInDb = await userModel.findOne({ email: userData.email });
      expect(userInDb).toBeTruthy();
      expect(userInDb.email).toBe(userData.email);
      expect(userInDb.avatar).toBe(userData.avatar);

      // Check if RabbitMQ message was sent
      const message = await rabbitMQService.getMessageFromQueue('user_created');
      expect(message).toBeTruthy();
      const parsedMessage = JSON.parse((message as GetMessage).content.toString());
      expect(parsedMessage.email).toBe(userData.email);
      expect(parsedMessage.avatar).toBe(userData.avatar);
    });

    it('should allow additional fields', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .send({
          email: 'test@example.com',
          avatar: 'https://example.com/avatar.jpg',
          name: 'John Doe',
          age: 30,
        })
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('_id');
          expect(res.body.email).toBe('test@example.com');
          expect(res.body.avatar).toBe('https://example.com/avatar.jpg');
          expect(res.body.name).toBe('John Doe');
          expect(res.body.age).toBe(30);
        });
    });

    it('should fail without required fields', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .send({ name: 'John Doe' })
        .expect(400);
    });
  });

  describe('/api/user/:id (GET)', () => {
    it('should return user by id', async () => {
      const userData = { email: 'test@example.com', avatar: 'https://example.com/avatar.jpg' };

      const { body: createdUser } = await request(app.getHttpServer())
        .post('/api/users')
        .send(userData);
      const id = createdUser._id;

      return request(app.getHttpServer())
        .get(`/api/user/${id}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toEqual({ _id: id, ...userData });
        });
    });
  });

  describe('/api/user/:id/avatar (GET)', () => {
    const userData = { email: 'test@example.com', avatar: 'http://localhost:3001/test-image.jpg' };
    let userId: string;

    beforeEach(async () => {
      const { body: createdUser } = await request(app.getHttpServer())
        .post('/api/users')
        .send(userData);
      userId = createdUser._id;
    });

    it('should return avatar, save it on fs and create entry in db on first request', async () => {
      const { text: base64String } = await request(app.getHttpServer())
        .get(`/api/user/${userId}/avatar`)
        .expect(200);

      // Check if the string is a valid base64 string
      const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(base64String);
      expect(isBase64).toBe(true);

      // Decode the base64 string
      const imageBuffer = Buffer.from(base64String, 'base64');

      // Check the buffer's first few bytes to ensure it's an image (JPEG)
      const isJpeg = imageBuffer.slice(0, 2).toString('hex') === 'ffd8';
      expect(isJpeg).toBe(true);

      // Check if entry is persisted in the database
      const entryInDb = await avatarModel.findOne({ userId });
      expect(entryInDb).toMatchObject({
        hash: expect.any(String),
        filePath: expect.any(String),
      });

      // Check if file is persisted on file system
      const fileBuffer = await fs.readFile(entryInDb.filePath);
      expect(imageBuffer.equals(fileBuffer)).toBe(true);
    });

    it('should return avatar from fs on following requests', async () => {
      // First request
      const { text: base64String } = await request(app.getHttpServer())
        .get(`/api/user/${userId}/avatar`);

      const entryInDb = await avatarModel.findOne({ userId });
      const readFileSpy = jest.spyOn(fs, 'readFile');

      // Following request
      const { text: base64StringFollowing } = await request(app.getHttpServer())
        .get(`/api/user/${userId}/avatar`)
        .expect(200);

      expect(base64StringFollowing).toBe(base64String);
      expect(readFileSpy).toHaveBeenCalledWith(entryInDb.filePath);
    });
  });

  describe('/api/user/:id/avatar (DELETE)', () => {
    it('should delete avatar from fs and entry from db', async () => {
      // Create user
      const { body: createdUser } = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          email: 'test@example.com',
          avatar: 'http://localhost:3001/test-image.jpg',
        });
      const userId = createdUser._id;

      // Save avatar on fs and entry in db
      await request(app.getHttpServer()).get(`/api/user/${userId}/avatar`);

      const entryInDb = await avatarModel.findOne({ userId });

      await request(app.getHttpServer())
        .delete(`/api/user/${userId}/avatar`)
        .expect(200);

      // Check if entry in db is deleted
      expect(await avatarModel.findOne({ userId })).toBe(null);

      // Check if file is deleted
      await expect(fs.access(entryInDb.filePath)).rejects.toThrow(/ENOENT/);
    });
  });
});
