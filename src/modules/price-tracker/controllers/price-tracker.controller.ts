import { Controller, Post, Logger, Body, Get, Res, UseInterceptors, HttpStatus, Param } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PriceTrackerService } from '../services/price-tracker.service';
import { CreatePriceAlertDto } from '../dtos/price-tracker.dto';
import { TransformResponseInterceptor } from '@/interceptors/response.interceptor';
import { ApiCustomHeader } from '@/shared/swagger/decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Price Tracker')
@ApiCustomHeader()
@UseInterceptors(TransformResponseInterceptor)
@Controller('price-tracker')
export class PriceTrackerController {
  private readonly logger = new Logger(PriceTrackerController.name);

  constructor(private readonly priceTrackerService: PriceTrackerService) {}

  @Post('track-prices')
  @Cron(CronExpression.EVERY_5_MINUTES)
  async trackPrices() {
    try {
      const prices = await this.priceTrackerService.fetchTokenPrices();
      this.logger.log(`Prices tracked successfully: ${JSON.stringify(prices)}`);
      return { message: 'Prices tracked successfully', prices };
    } catch (error) {
      this.logger.error('Error tracking prices', error);
      throw error;
    }
  }

  @Post('create-alert')
  async createPriceAlert(@Body() createPriceAlertDto: CreatePriceAlertDto) {
    try {
      return this.priceTrackerService.createPriceAlert(createPriceAlertDto);
    } catch (error) {
      this.logger.error('Error creating price alert', error);
      throw error;
    }
  }

  @Get('last-24-hours')
  async getLastHourPrices() {
    try {
      return this.priceTrackerService.getLastHourPrices();
    } catch (error) {
      this.logger.error('Error fetching last hour prices', error);
      throw new Error('Error fetching last hour prices');
    }
  }

  @Get('swap-rate/:ethAmount')
  async getSwapRate(
    @Param('ethAmount') ethAmount: number
  ) {
    try {
        return this.priceTrackerService.getSwapRate(ethAmount);
    } catch (error) {
        this.logger.error('Error getting swap rate', error);
        throw new Error('Error getting swap rate');
    }
  }
}
