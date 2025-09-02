import type { ConfigurationVariableResolver, HardhatConfig, HardhatUserConfig } from "hardhat/types/config";
import type { ConfigHooks, HardhatUserConfigValidationError } from "hardhat/types/hooks";

import { validateUserConfigZodType } from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

import { isAbsolute } from "path";
import type { DlMarkupConfig, DlMarkupUserConfig } from "../../types.js";

export default async (): Promise<Partial<ConfigHooks>> => ({
  validateUserConfig,
  resolveUserConfig,
});

const userConfigType = z.object({
  markup: z
    .object({
      outdir: z.string().optional(),
      onlyFiles: z.array(z.string().refine((p) => !isAbsolute(p), "Expected a relative path")).optional(),
      skipFiles: z.array(z.string().refine((p) => !isAbsolute(p), "Expected a relative path")).optional(),
      noCompile: z.boolean().optional(),
      verbose: z.boolean().optional(),
    })
    .optional(),
});

export async function validateUserConfig(userConfig: HardhatUserConfig): Promise<HardhatUserConfigValidationError[]> {
  return validateUserConfigZodType(userConfig, userConfigType);
}

export async function resolveUserConfig(
  userConfig: HardhatUserConfig,
  resolveConfigurationVariable: ConfigurationVariableResolver,
  next: (
    nextUserConfig: HardhatUserConfig,
    nextResolveConfigurationVariable: ConfigurationVariableResolver,
  ) => Promise<HardhatConfig>,
): Promise<HardhatConfig> {
  const resolvedConfig = await next(userConfig, resolveConfigurationVariable);

  return {
    ...resolvedConfig,
    markup: {
      ...resolvedConfig.markup,
      ...omitUndefined(await resolveMarkupConfig(userConfig.markup, resolveConfigurationVariable)),
    },
  };
}

async function resolveMarkupConfig(
  markupConfig: DlMarkupUserConfig | undefined,
  resolveConfigurationVariable: ConfigurationVariableResolver,
): Promise<Partial<DlMarkupConfig>> {
  const defaultConfig: DlMarkupConfig = {
    outdir: "./generated-markups",
    onlyFiles: [],
    skipFiles: [],
    noCompile: false,
    verbose: false,
  };

  if (markupConfig === undefined) {
    return defaultConfig;
  }

  const resolved: DlMarkupConfig = defaultConfig;

  if (typeof markupConfig.outdir === "string") {
    resolved.outdir = await resolveConfigurationVariable(markupConfig.outdir).get();
  }

  if (Array.isArray(markupConfig.onlyFiles)) {
    resolved.onlyFiles = await Promise.all(
      markupConfig.onlyFiles.map((p: string) => resolveConfigurationVariable(p).get()),
    );
  }

  if (Array.isArray(markupConfig.skipFiles)) {
    resolved.skipFiles = await Promise.all(
      markupConfig.skipFiles.map((p: string) => resolveConfigurationVariable(p).get()),
    );
  }

  if (typeof markupConfig.noCompile === "boolean") {
    resolved.noCompile = markupConfig.noCompile;
  }

  if (typeof markupConfig.verbose === "boolean") {
    resolved.verbose = markupConfig.verbose;
  }

  return resolved;
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (out as any)[key] = value;
    }
  }
  return out;
}
