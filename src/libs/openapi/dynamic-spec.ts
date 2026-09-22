import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { getAllApiConfigs } from "@/libs/supabase/queries/content-api-configs";
import { registerHealthPaths } from "@/libs/openapi/schemas/health.schema";
import { registerUserPaths } from "@/libs/openapi/schemas/user.schema";
import { registerFranchisePopupPaths } from "@/libs/openapi/schemas/franchise-popups.schema";

const TYPED_SLUGS: Record<string, (reg: OpenAPIRegistry) => void> = {
  users: registerUserPaths,
  "franchise-popups": registerFranchisePopupPaths,
};

export async function buildDynamicOpenApiSpec(
  baseUrl = "http://localhost:3001",
) {
  const reg = new OpenAPIRegistry();

  reg.registerComponent("securitySchemes", "ApiKeyAuth", {
    type: "apiKey",
    in: "header",
    name: "X-API-Key",
    description: ".env.local의 INTERNAL_API_KEY 값",
  });

  registerHealthPaths(reg);

  const configs = await getAllApiConfigs();
  for (const config of configs) {
    if (!config.is_enabled) continue;
    const registerFn = TYPED_SLUGS[config.resource_slug];
    if (registerFn) {
      registerFn(reg);
    }
  }

  const generator = new OpenApiGeneratorV31(reg.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Franchise CMS API",
      version: "1.0.0",
      description: "Franchise 관리자 CMS의 REST API 문서입니다.",
    },
    servers: [{ url: baseUrl, description: "API Server" }],
  });
}
