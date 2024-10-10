import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsDate, IsOptional } from 'class-validator';

export class CreatePriceAlertDto {
  @ApiProperty()
  @IsString()
  tokenAddress: string;

  @ApiProperty()
  @IsNumber()
  targetPrice: number;

  @ApiProperty()
  @IsString()
  email: string;
}

export class TokenPriceDto {
  @ApiProperty()
  @IsString()
  tokenAddress: string;

  @ApiProperty()
  @IsNumber()
  usdPrice: number;

  @ApiProperty()
  @IsString()
  usdPriceFormatted: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  percentChange24h?: number;

  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  timestamp?: Date;
}
