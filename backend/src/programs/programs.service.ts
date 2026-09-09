import { Injectable } from '@nestjs/common';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';

@Injectable()
export class ProgramsService {
  create(createProgramDto: CreateProgramDto) {
    return 'This action adds a new program';
  }

  findAll() {
    return `This action returns all programs`;
  }

  findOne(id: string) {
    return `This action returns a #${id} program`;
  }

  update(id: string, updateProgramDto: UpdateProgramDto) {
    return `This action updates a #${id} program`;
  }

  remove(id: string) {
    return `This action removes a #${id} program`;
  }
}
