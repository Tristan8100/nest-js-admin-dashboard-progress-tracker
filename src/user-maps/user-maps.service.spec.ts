import { Test, TestingModule } from '@nestjs/testing';
import { UserMapsService } from './user-maps.service';

describe('UserMapsService', () => {
  let service: UserMapsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserMapsService],
    }).compile();

    service = module.get<UserMapsService>(UserMapsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
