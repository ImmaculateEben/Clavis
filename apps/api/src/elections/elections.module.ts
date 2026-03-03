import { Module } from '@nestjs/common';
import { ElectionsController } from './elections.controller';
import { ElectionsService } from './elections.service';

@Module({
    controllers: [ElectionsController],
    providers: [ElectionsService],
    exports: [ElectionsService],
})
export class ElectionsModule { }
