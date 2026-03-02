import { PartialType } from '@nestjs/mapped-types';
import { CreateSaeDto } from './create-sae.dto';

export class UpdateSaeDto extends PartialType(CreateSaeDto) {}
