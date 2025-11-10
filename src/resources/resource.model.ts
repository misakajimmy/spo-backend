import prisma from '../models/prisma';
import { ResourceLibrary } from '@prisma/client';
import { LibraryType } from './types';

// 辅助函数：将配置对象转换为JSON字符串
function configToString(config: any): string {
  return JSON.stringify(config);
}

// 辅助函数：将JSON字符串转换为配置对象
function stringToConfig(configStr: string): any {
  try {
    return JSON.parse(configStr);
  } catch {
    return {};
  }
}

// 辅助函数：转换数据库记录
function transformLibraryRecord(record: any): any {
  if (!record) return null;
  return {
    ...record,
    config: stringToConfig(record.config)
  };
}

export class ResourceLibraryModel {
  // 创建资源库配置
  static async create(data: {
    name: string;
    type: LibraryType;
    config: any;
    isDefault?: boolean;
  }): Promise<ResourceLibrary> {
    // 如果设置为默认，先取消其他默认配置
    if (data.isDefault) {
      await prisma.resourceLibrary.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }
    
    const record = await prisma.resourceLibrary.create({
      data: {
        name: data.name,
        type: data.type,
        config: configToString(data.config),
        isDefault: data.isDefault ?? false,
        isActive: true,
      }
    });
    
    return transformLibraryRecord(record);
  }
  
  // 获取所有资源库配置
  static async findAll(): Promise<ResourceLibrary[]> {
    const records = await prisma.resourceLibrary.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    return records.map(transformLibraryRecord);
  }
  
  // 获取激活的资源库配置
  static async findActive(): Promise<ResourceLibrary[]> {
    const records = await prisma.resourceLibrary.findMany({
      where: { isActive: true },
      orderBy: {
        isDefault: 'desc'
      }
    });
    return records.map(transformLibraryRecord);
  }
  
  // 根据ID获取资源库
  static async findById(id: number): Promise<ResourceLibrary | null> {
    const record = await prisma.resourceLibrary.findUnique({
      where: { id }
    });
    return transformLibraryRecord(record);
  }
  
  // 获取默认资源库
  static async findDefault(): Promise<ResourceLibrary | null> {
    const record = await prisma.resourceLibrary.findFirst({
      where: {
        isDefault: true,
        isActive: true
      }
    });
    return transformLibraryRecord(record);
  }
  
  // 更新资源库配置
  static async update(id: number, data: {
    name?: string;
    type?: string;
    config?: any;
    isActive?: boolean;
    isDefault?: boolean;
  }): Promise<ResourceLibrary> {
    // 如果设置为默认，先取消其他默认配置
    if (data.isDefault) {
      await prisma.resourceLibrary.updateMany({
        where: { 
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      });
    }
    
    // 如果有config，转换为JSON字符串
    const updateData: any = { ...data };
    if (data.config) {
      updateData.config = configToString(data.config);
    }
    
    const record = await prisma.resourceLibrary.update({
      where: { id },
      data: updateData
    });
    
    return transformLibraryRecord(record);
  }
  
  // 删除资源库配置
  static async delete(id: number): Promise<ResourceLibrary> {
    const record = await prisma.resourceLibrary.delete({
      where: { id }
    });
    return transformLibraryRecord(record);
  }
  
  // 设置默认资源库
  static async setDefault(id: number): Promise<ResourceLibrary> {
    // 先取消所有默认
    await prisma.resourceLibrary.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    });
    
    // 设置新的默认
    const record = await prisma.resourceLibrary.update({
      where: { id },
      data: { isDefault: true }
    });
    
    return transformLibraryRecord(record);
  }
}
