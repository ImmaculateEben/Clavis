import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './jwt-auth.guard';

/** Mark a route handler or controller as publicly accessible (no JWT required) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
