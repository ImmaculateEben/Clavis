import { Controller, Get, Patch, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notifications: NotificationsService) { }

    @Get()
    getUnread(@CurrentUser() user: AuthenticatedUser) {
        return this.notifications.getUnread(user.email);
    }

    @Patch(':id/read')
    markRead(@Param('id') id: string) {
        return this.notifications.markRead(id);
    }
}
