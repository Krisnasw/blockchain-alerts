import { Injectable, Logger } from '@nestjs/common';
import Moralis from 'moralis';
import { Resend } from 'resend';

import { PriceTrackerRepository } from '../repository/price-tracker.repository';
import { CreatePriceAlertDto } from '../dtos/price-tracker.dto';

import { SettingService } from '@/shared/services/setting.service';

@Injectable()
export class PriceTrackerService {
  private readonly logger = new Logger(PriceTrackerService.name);
  private resend: Resend;

  constructor(
    private readonly priceTrackerRepository: PriceTrackerRepository,
    private readonly settingService: SettingService,
  ) {
    Moralis.start({ apiKey: this.settingService.moralisConfig.apiKey });
    this.initializeResend();
  }

  private initializeResend() {
    this.resend = new Resend(this.settingService.resendConfig.apiKey);
  }

  async fetchTokenPrices() {
    try {
      const response = await Moralis.EvmApi.token.getMultipleTokenPrices(
        {
          chain: '0x1',
          include: 'percent_change',
        },
        {
          tokens: [
            {
              tokenAddress: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
            },
            {
              tokenAddress: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
            },
          ],
        },
      );

      const prices = response.toJSON().map((token: any) => ({
        tokenAddress: token.tokenAddress,
        usdPrice: token.usdPrice,
        usdPriceFormatted: token.usdPriceFormatted,
        percentChange24h: Math.round(Number(token['24hrPercentChange'])),
        timestamp: new Date(),
      }));

      // Save prices to repository
      for (const price of prices) {
        await this.priceTrackerRepository.savePrice(price);
      }

      return prices;
    } catch (error) {
      this.logger.error('Error fetching prices', error);
      throw error;
    }
  }

  async createPriceAlert(createPriceAlertDto: CreatePriceAlertDto) {
    try {
      const alert =
        await this.priceTrackerRepository.createPriceAlert(createPriceAlertDto);
      return alert;
    } catch (error) {
      this.logger.error('Error creating price alert', error);
      throw error;
    }
  }

  async getLastHourPrices() {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    const prices = await this.priceTrackerRepository.getPricesByTimestampRange(
      lastHour,
      now,
    );

    return prices;
  }

  async getSwapRate(ethAmount: number) {
    try {
      const response: any = await Moralis.EvmApi.token.getTokenPrice({
        address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        include: 'percent_change',
        chain: '0x1',
      });

      const ethPrice =
        response?.nativePrice?.value / 10 ** response.nativePrice?.decimals;

      const btcResponse: any = await Moralis.EvmApi.token.getTokenPrice({
        address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        include: 'percent_change',
        chain: '0x1',
      });

      const btcPrice = btcResponse.usdPrice;
      const btcAmount = ethAmount / btcPrice;
      const ethFee = ethAmount * 0.03;
      const dollarFee = ethFee * ethPrice;

      return {
        btcAmount,
        ethFee,
        dollarFee,
      };
    } catch (error) {
      this.logger.error('Error getting swap rate', error);
      throw error;
    }
  }

  async checkPriceChangesAndAlert() {
    try {
      const currentPrices = await this.fetchTokenPrices();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const previousPrices =
        await this.priceTrackerRepository.getPricesByTimestampRange(
          oneHourAgo,
          new Date(),
        );

      for (const currentPrice of currentPrices) {
        const previousPrice = previousPrices.find(
          (p) => p.tokenAddress === currentPrice.tokenAddress,
        );

        if (previousPrice) {
          const priceChangePercent =
            ((currentPrice.usdPrice - previousPrice.usdPrice) /
              previousPrice.usdPrice) *
            100;

          if (priceChangePercent > 3) {
            await this.sendPriceAlertEmail(
              currentPrice.tokenAddress,
              previousPrice.usdPrice,
              currentPrice.usdPrice,
              priceChangePercent,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        'Error checking price changes and sending alerts',
        error,
      );
    }
  }

  private async sendPriceAlertEmail(
    tokenAddress: string,
    previousPrice: number,
    currentPrice: number,
    changePercent: number,
  ) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Noreply <noreply@krisnasw.xyz>',
        to: ['hyperhire_assignment@hyperhire.in'],
        subject: 'Price Alert: Significant Chain Price Increase',
        text: `
          The price of the chain with address ${tokenAddress} has increased by ${changePercent.toFixed(2)}% in the last hour.
          Previous price: $${previousPrice.toFixed(2)}
          Current price: $${currentPrice.toFixed(2)}
        `,
      });

      if (error) {
        throw error;
      }

      this.logger.log(
        `Price alert email sent for token ${tokenAddress}. Email ID: ${data.id}`,
      );
    } catch (error) {
      this.logger.error('Error sending price alert email', error);
      throw new Error(error);
    }
  }

  async checkPriceAlerts() {
    try {
      const alerts =
        await this.priceTrackerRepository.getUntriggeredPriceAlerts();

      for (const alert of alerts) {
        const currentPrice = await this.getTokenPrice(alert.tokenAddress);

        if (currentPrice >= alert.targetPrice) {
          await this.sendPriceAlertEmailSpecified(
            alert.email,
            alert.tokenAddress,
            alert.targetPrice,
            currentPrice,
          );
          await this.priceTrackerRepository.markAlertAsTriggered(alert.id);
        }
      }
    } catch (error) {
      this.logger.error('Error checking price alerts', error);
    }
  }

  private async getTokenPrice(tokenAddress: string): Promise<number> {
    const response = await Moralis.EvmApi.token.getTokenPrice({
      address: tokenAddress,
      chain: '0x1',
    });

    return response.toJSON().usdPrice;
  }

  private async sendPriceAlertEmailSpecified(
    email: string,
    tokenAddress: string,
    targetPrice: number,
    currentPrice: number,
  ) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Noreply <noreply@krisnasw.xyz>',
        to: [email],
        subject: `Price Alert: Token ${tokenAddress} has reached your target price`,
        text: `
          The price of the token with address ${tokenAddress} has reached your target price of $${targetPrice.toFixed(2)}.
          Current price: $${currentPrice.toFixed(2)}
        `,
      });

      if (error) {
        throw error;
      }

      this.logger.log(
        `Price alert email sent for token ${tokenAddress}. Email ID: ${data.id}`,
      );
    } catch (error) {
      this.logger.error('Error sending price alert email', error);
    }
  }
}
