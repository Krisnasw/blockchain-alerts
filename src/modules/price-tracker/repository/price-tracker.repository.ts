import { Injectable } from '@nestjs/common';

import { CreatePriceAlertDto, TokenPriceDto } from '../dtos/price-tracker.dto';

import { PrismaService } from '@/shared/prisma/prisma.service';

@Injectable()
export class PriceTrackerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async savePrice(data: TokenPriceDto) {
    return await this.prisma.priceRecord.create({
      data: {
        ...data,
        percentChange24h: data.percentChange24h,
        timestamp: new Date(),
      },
    });
  }

  async getPricesLastHour(tokenAddress: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return await this.prisma.priceRecord.findMany({
      where: {
        tokenAddress,
        timestamp: {
          gte: oneHourAgo,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  async createPriceAlert(createPriceAlertDto: CreatePriceAlertDto) {
    return await this.prisma.priceAlert.create({
      data: {
        ...createPriceAlertDto,
        triggered: false,
      },
    });
  }

  async getPricesByTimestampRange(
    startDate: Date,
    endDate: Date,
  ) {
    return await this.prisma.priceRecord.findMany({
      where: {
        timestamp: {
            gte: startDate,
            lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }
}
