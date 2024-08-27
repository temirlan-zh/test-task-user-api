import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;

  const mockUserService = {
    create: jest.fn().mockImplementation(dto => Promise.resolve({ _id: 'some-id', ...dto })),
    findOne: jest.fn(),
    getAvatar: jest.fn(),
    deleteAvatar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto = { email: 'test@example.com', avatar: 'https://example.com/avatar.jpg' };
      const result = await controller.create(createUserDto);

      expect(result).toEqual({ _id: expect.any(String), ...createUserDto });
      expect(mockUserService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const id = 'some-id';
      const user = { _id: id };

      mockUserService.findOne.mockResolvedValueOnce(user);

      const result = await controller.findOne(id);

      expect(result).toEqual(user);
      expect(mockUserService.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('getAvatar', () => {
    it('should return avatar by user id', async () => {
      const userId = 'some-id';
      const base64String = Buffer.from('image data').toString('base64');

      mockUserService.getAvatar.mockResolvedValueOnce(base64String);

      const result = await controller.getAvatar(userId);

      expect(result).toBe(base64String);
      expect(mockUserService.getAvatar).toHaveBeenCalledWith(userId);
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar by user id', async () => {
      const userId = 'some-id';

      await controller.deleteAvatar(userId);

      expect(mockUserService.deleteAvatar).toHaveBeenCalledWith(userId);
    });
  });
});
