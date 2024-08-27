import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './user.dto';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('api/users')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get('api/user/:id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Get('api/user/:id/avatar')
  async getAvatar(@Param('id') userId: string) {
    return this.userService.getAvatar(userId);
  }

  @Delete('api/user/:id/avatar')
  async deleteAvatar(@Param('id') userId: string) {
    return this.userService.deleteAvatar(userId);
  }
}
