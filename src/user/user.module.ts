import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './user.model';
import { EmailModule } from '../email/email.module';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { Avatar, AvatarSchema } from './avatar/avatar.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Avatar.name, schema: AvatarSchema },
    ]),
    EmailModule,
    RabbitMQModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
