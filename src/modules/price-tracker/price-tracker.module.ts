import { Module } from "@nestjs/common";
import { PriceTrackerController } from "./controllers/price-tracker.controller";
import { PriceTrackerService } from "./services/price-tracker.service";
import { PrismaService } from "@/shared/prisma/prisma.service";
import { PriceTrackerRepository } from "./repository/price-tracker.repository";

@Module({
    controllers: [PriceTrackerController],
    providers: [PriceTrackerService, PriceTrackerRepository, PrismaService],
})
export class PriceTrackerModule {}