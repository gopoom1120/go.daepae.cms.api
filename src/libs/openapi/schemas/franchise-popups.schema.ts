import { z } from "zod";
import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import "@/libs/openapi/registry";

export const FranchisePopupSchema = z
  .object({
    id: z
      .string()
      .uuid()
      .openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    title: z.string().openapi({ example: "추석 연휴 휴무 안내" }),
    image_url: z
      .string()
      .nullable()
      .openapi({ example: "https://example.com/popup.jpg" }),
    link_url: z
      .string()
      .nullable()
      .openapi({ example: "https://example.com/notice/1" }),
    start_date: z.string().nullable().openapi({ example: "2026-09-16" }),
    end_date: z.string().nullable().openapi({ example: "2026-09-18" }),
    sort_order: z.number().int().openapi({ example: 1 }),
    created_at: z
      .string()
      .datetime()
      .openapi({ example: "2026-07-21T00:00:00.000Z" }),
  })
  .openapi("FranchisePopup");

export const FranchisePopupListResponseSchema = z
  .object({
    data: z.array(FranchisePopupSchema),
    total: z.number().int().openapi({ example: 2 }),
    page: z.number().int().openapi({ example: 1 }),
    limit: z.number().int().openapi({ example: 10 }),
  })
  .openapi("FranchisePopupListResponse");

export const FranchisePopupDetailResponseSchema = z
  .object({ data: FranchisePopupSchema })
  .openapi("FranchisePopupDetailResponse");

export function registerFranchisePopupPaths(reg: OpenAPIRegistry) {
  reg.registerPath({
    method: "get",
    path: "/api/v1/franchise-popups",
    summary: "가맹점 팝업 공지 목록 조회",
    description:
      "발행된(is_published=true) 팝업 중 노출 기간(start_date~end_date)이 현재인 항목만 반환합니다(franchise_popups_public 뷰 기준).",
    security: [{ ApiKeyAuth: [] }],
    request: {
      query: z.object({
        page: z
          .string()
          .optional()
          .openapi({ example: "1", description: "페이지 번호 (기본값: 1)" }),
        limit: z.string().optional().openapi({
          example: "10",
          description: "페이지당 건수 (기본값: 10)",
        }),
      }),
    },
    responses: {
      200: {
        description: "팝업 목록",
        content: {
          "application/json": { schema: FranchisePopupListResponseSchema },
        },
      },
      401: {
        description: "인증 실패",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  });

  reg.registerPath({
    method: "get",
    path: "/api/v1/franchise-popups/{id}",
    summary: "가맹점 팝업 공지 단건 조회",
    description: "UUID로 팝업 상세를 반환합니다.",
    security: [{ ApiKeyAuth: [] }],
    request: {
      params: z.object({
        id: z
          .string()
          .uuid()
          .openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
      }),
    },
    responses: {
      200: {
        description: "팝업 상세",
        content: {
          "application/json": { schema: FranchisePopupDetailResponseSchema },
        },
      },
      400: {
        description: "유효하지 않은 UUID",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
      401: {
        description: "인증 실패",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
      404: {
        description: "팝업을 찾을 수 없음",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  });
}
