import { Test, TestingModule } from '@nestjs/testing';
import { UserMapsController } from './user-maps.controller';

describe('UserMapsController', () => {
  let controller: UserMapsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserMapsController],
    }).compile();

    controller = module.get<UserMapsController>(UserMapsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
