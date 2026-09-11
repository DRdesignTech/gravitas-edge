import { Test } from '@nestjs/testing';
import { PublicExperienceLevelsController } from './public-experience-levels.controller';
import { PrismaService } from '../prisma/prisma.service';

function mockPrismaService() {
  return {
    experienceLevel: {
      findMany: jest.fn(),
    },
  } as any;
}

describe('PublicExperienceLevelsController', () => {
  let controller: PublicExperienceLevelsController;
  let prisma: ReturnType<typeof mockPrismaService>;

  beforeEach(async () => {
    prisma = mockPrismaService();
    const module = await Test.createTestingModule({
      controllers: [PublicExperienceLevelsController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();
    controller = module.get(PublicExperienceLevelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return experience levels ordered by sortOrder then minYears', async () => {
    const rows = [
      { id: 'el-1', name: 'Early Career', minYears: 0, maxYears: 2, sortOrder: 1 },
      { id: 'el-2', name: 'Executive', minYears: 6, maxYears: null, sortOrder: 2 },
    ];
    prisma.experienceLevel.findMany.mockResolvedValue(rows);

    await expect(controller.list()).resolves.toEqual(rows);
    expect(prisma.experienceLevel.findMany).toHaveBeenCalledWith({
      orderBy: [{ sortOrder: 'asc' }, { minYears: 'asc' }],
      select: { id: true, name: true, minYears: true, maxYears: true, sortOrder: true },
    });
  });
});
