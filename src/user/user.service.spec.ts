import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './user.model';
import { EmailService } from '../email/email.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { Avatar } from './avatar/avatar.model';
import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';

jest.mock('axios');
jest.mock('fs/promises');

describe('UserService', () => {
  let service: UserService;
  let emailService: EmailService;
  let rabbitMQService: RabbitMQService;

  const mockUserModel = {
    create: jest.fn().mockImplementation(dto => Promise.resolve({ _id: 'some-id', ...dto })),
    findById: jest.fn(),
  };

  const mockAvatarModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: EmailService,
          useValue: { sendEmail: jest.fn() },
        },
        {
          provide: RabbitMQService,
          useValue: { sendMessage: jest.fn() },
        },
        {
          provide: getModelToken(Avatar.name),
          useValue: mockAvatarModel,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    emailService = module.get<EmailService>(EmailService);
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user and send email and rabbit message', async () => {
      const createUserDto = { email: 'test@example.com', avatar: 'https://example.com/avatar.jpg' };
      const result = await service.create(createUserDto);

      expect(result).toEqual({ _id: expect.any(String), ...createUserDto });
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        createUserDto.email,
        'Welcome!',
        'Thank you for registering.',
      );
      expect(rabbitMQService.sendMessage).toHaveBeenCalledWith('user_created', result);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const id = 'some-id';
      const user = { _id: id };

      mockUserModel.findById.mockResolvedValueOnce(user);

      const result = await service.findOne(id);

      expect(result).toEqual(user);
      expect(mockUserModel.findById).toHaveBeenCalledWith(id);
    });
  });

  describe('getAvatar', () => {
    const userId = 'some-id';
    const imageBuffer = Buffer.from('image data');
    const base64String = imageBuffer.toString('base64');

    it('should return avatar, save it on fs and create entry in db on first request', async () => {
      const avatarUrl = 'https://example.com/avatar.jpg';
      const hash = crypto.createHash('md5').update(imageBuffer).digest('hex');
      const filePath = expect.stringContaining('.jpg');

      mockAvatarModel.findOne.mockResolvedValueOnce(null);
      mockUserModel.findById.mockResolvedValueOnce({ avatar: avatarUrl });
      jest.mocked(axios.get).mockResolvedValueOnce({ data: imageBuffer });

      const result = await service.getAvatar(userId);

      expect(result).toBe(base64String);
      expect(mockAvatarModel.findOne).toHaveBeenCalledWith({ userId });
      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(axios.get).toHaveBeenCalledWith(avatarUrl, { responseType: 'arraybuffer' });
      expect(fs.writeFile).toHaveBeenCalledWith(filePath, imageBuffer);
      expect(mockAvatarModel.create).toHaveBeenCalledWith({ userId, hash, filePath });
    });

    it('should return avatar from fs on following request', async () => {
      const filePath = 'file-path/file-name.jpg';

      mockAvatarModel.findOne.mockResolvedValueOnce({ filePath });
      jest.mocked(fs.readFile).mockResolvedValueOnce(imageBuffer);

      const result = await service.getAvatar(userId);

      expect(result).toBe(base64String);
      expect(fs.readFile).toHaveBeenCalledWith(filePath);
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar from fs and entry from db', async () => {
      const userId = 'some-id';
      const filePath = 'file-path/file-name.jpg';

      mockAvatarModel.findOne.mockResolvedValueOnce({ filePath });
      mockAvatarModel.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

      await service.deleteAvatar(userId);

      expect(mockAvatarModel.findOne).toHaveBeenCalledWith({ userId });
      expect(fs.unlink).toHaveBeenCalledWith(filePath);
      expect(mockAvatarModel.deleteOne).toHaveBeenCalledWith({ userId });
    });
  });
});
