import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from '../common/dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateLocationDto) {
    return this.prisma.location.create({
      data: {
        name: dto.name,
        city: dto.city,
        state: dto.state,
        priority: dto.priority,
        serviceZones: dto.serviceZones ?? [],
      },
    });
  }

  findAll() {
    return this.prisma.location.findMany({ orderBy: { priority: 'asc' } });
  }
}
