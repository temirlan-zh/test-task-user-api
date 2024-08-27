import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { User } from './user.model';
import { CreateUserDto } from './user.dto';
import { EmailService } from '../email/email.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { Avatar } from './avatar/avatar.model';
import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Avatar.name) private avatarModel: Model<Avatar>,
    private emailService: EmailService,
    private rabbitMQService: RabbitMQService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = await this.userModel.create(createUserDto);

    this.emailService.sendEmail(createdUser.email, 'Welcome!', 'Thank you for registering.');
    this.rabbitMQService.sendMessage('user_created', createdUser);

    return createdUser;
  }

  async findOne(id: ObjectId | string): Promise<User> {
    return this.userModel.findById(id);
  }

  async getAvatar(userId: ObjectId | string): Promise<string> {
    const fileInfo = await this.avatarModel.findOne({ userId });
    let buffer: Buffer

    if (!fileInfo) {
      const { avatar: url } = await this.userModel.findById(userId);
      const result = await axios.get<Buffer>(
        url, 
        { responseType: 'arraybuffer' },
      );
      buffer = result.data;
      const hash = crypto.createHash('md5').update(buffer).digest('hex');
      const filePath = path.join(process.cwd(), 'avatars', `${userId}.jpg`);

      // Ensure the directory exists (create it if it doesn't)
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(filePath, buffer);
      await this.avatarModel.create({ userId, hash, filePath });
    } else {
      buffer = await fs.readFile(fileInfo.filePath);
    }

    return buffer.toString('base64');
  }

  async deleteAvatar(userId: ObjectId | string) {
    const fileInfo = await this.avatarModel.findOne({ userId });

    await fs.unlink(fileInfo.filePath);
    await this.avatarModel.deleteOne({ userId });
  }
}
