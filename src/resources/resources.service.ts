import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UTApi } from 'uploadthing/server';
import { UserRole } from '@prisma/client';
import { DocumentsService } from '../documents/documents.service';
import { UploadResourceDto } from './dto/upload-resource.dto';

@Injectable()
export class ResourcesService {
  private readonly utapi = new UTApi();

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
  ) {}

  async findBanners(): Promise<any[]> {
    return this.prisma.banner.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async uploadAndRegister(
    file: Express.Multer.File,
    dto: UploadResourceDto,
    userId: string,
    role: UserRole,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');

    // 1. Vérifier l'existence de la SAE avant l'upload
    const sae = await this.prisma.sae.findUnique({
      where: { id: dto.saeId, deletedAt: null },
    });
    if (!sae) throw new BadRequestException('SAE non trouvée');

    // 2. Upload vers UploadThing
    let uploadResult;
    try {
      uploadResult = await this.utapi.uploadFiles(
        new File([new Uint8Array(file.buffer)], file.originalname, {
          type: file.mimetype,
        }),
      );

      if (!uploadResult.data) {
        throw new InternalServerErrorException(
          "L'upload vers UploadThing a échoué",
        );
      }
    } catch (error) {
      throw new InternalServerErrorException(
        "Erreur lors de l'upload : " + error.message,
      );
    }

    const fileData = uploadResult.data;

    // 3. Enregistrement en base de données
    try {
      if (role === UserRole.STUDENT) {
        if (!dto.description) {
          throw new BadRequestException(
            'La description est obligatoire pour un rendu',
          );
        }

        return await this.documentsService.submitDocument(
          dto.saeId,
          {
            url: fileData.url,
            name: fileData.name,
            mimeType: file.mimetype,
            description: dto.description,
            imageUrl: dto.imageUrl,
          },
          userId,
        );
      } else {
        return await this.documentsService.addSaeDocument(
          dto.saeId,
          {
            url: fileData.url,
            name: fileData.name,
            mimeType: file.mimetype,
            type: dto.type || 'RESOURCE',
          },
          userId,
        );
      }
    } catch (error) {
      // ROLLBACK : Supprimer le fichier d'UploadThing en cas d'échec d'enregistrement en base
      await this.utapi.deleteFiles(fileData.key);
      throw error;
    }
  }

  async findAllPromotions() {
    return this.prisma.promotion.findMany({
      where: { isActive: true },
      orderBy: { label: 'asc' },
    });
  }

  async findAllGroups() {
    return this.prisma.group.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findAllSemesters() {
    return this.prisma.semester.findMany({
      orderBy: [{ promotionId: 'asc' }, { number: 'asc' }],
      include: {
        promotion: {
          select: { label: true },
        },
      },
    });
  }
}
