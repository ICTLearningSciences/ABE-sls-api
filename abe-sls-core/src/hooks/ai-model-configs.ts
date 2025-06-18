/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { AiServiceModelConfigs, ServiceModelInfo } from '../gql_types.js';
import { TargetAiModelServiceType } from '../types.js';
import { fetchAiServiceModelConfigs } from './graphql_api.js';

export class AiModelConfigs {
  private static instance: AiModelConfigs;
  private configs: AiServiceModelConfigs[] = [];
  private initialized = false;

  private constructor() {}

  public static getInstance(): AiModelConfigs {
    if (!AiModelConfigs.instance) {
      AiModelConfigs.instance = new AiModelConfigs();
    }
    return AiModelConfigs.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.configs = await fetchAiServiceModelConfigs();
    this.initialized = true;
  }

  public getModelInfo(targetModel: TargetAiModelServiceType): ServiceModelInfo {
    if (!this.initialized) {
      throw new Error(
        'AiModelConfigs not initialized. Call initialize() first.'
      );
    }

    const serviceConfig = this.configs.find(
      (config) => config.serviceName === targetModel.serviceName
    );

    if (!serviceConfig) {
      throw new Error(
        `Service config not found for ${targetModel.serviceName}`
      );
    }

    const modelInfo = serviceConfig.modelList.find(
      (model) => model.name === targetModel.model
    );

    if (!modelInfo) {
      throw new Error(
        `Model info not found for ${targetModel.model} in ${targetModel.serviceName}`
      );
    }

    return modelInfo;
  }

  public getAllConfigs(): AiServiceModelConfigs[] {
    if (!this.initialized) {
      throw new Error(
        'AiModelConfigs not initialized. Call initialize() first.'
      );
    }
    return this.configs;
  }
}
