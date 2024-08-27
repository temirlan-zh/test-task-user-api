import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect() {
    try {
      this.connection = await amqp.connect(this.configService.get<string>('RABBITMQ_URL'));
      this.channel = await this.connection.createChannel();
    } catch (error) {
      console.error('Failed to connect to RabbitMQ', error);
    }
  }

  async close() {
    try {
      await this.channel.close();
      await this.connection.close();
    } catch (error) {
      console.error('Failed to close RabbitMQ connection', error);
    }
  }

  async sendMessage(queue: string, message: any) {
    try {
      await this.channel.assertQueue(queue);
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    } catch (error) {
      console.error('Failed to send message to RabbitMQ', error);
    }
  }

  async getMessageFromQueue(queue: string): Promise<amqp.GetMessage | false> {
    await this.channel.assertQueue(queue);
    return this.channel.get(queue);
  }

  async purgeQueue(queue: string): Promise<void> {
    await this.channel.assertQueue(queue);
    await this.channel.purgeQueue(queue);
  }
}
