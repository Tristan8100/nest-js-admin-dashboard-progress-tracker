import { PartialType } from '@nestjs/swagger';
import { CreateUserMapDto } from '../create-user-map.dto/create-user-map.dto';

export class UpdateUserMapDto extends PartialType(
  CreateUserMapDto,
) {}