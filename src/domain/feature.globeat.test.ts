import { describe, expect, it } from "vitest";
import { createDevelopmentFeatureSpec } from "./feature";

describe("Globeat 인증 기능명세", () => {
  it("실제 인증 공급자와 콜백을 독립 노드로 생성한다", () => {
    const features = createDevelopmentFeatureSpec("globeat-project", "Globeat");
    const auth = features.find((feature) => feature.id === "globeat-project-auth");
    const children = features.filter((feature) => feature.parentId === auth?.id);
    expect(auth?.status).toBe("in_progress");
    expect(children.map((feature) => feature.title)).toEqual(expect.arrayContaining(["Google OAuth 로그인", "Instagram/Meta 계정 로그인", "일반 이메일 회원가입", "이메일 비밀번호 로그인", "인증 콜백·프로필 자동 생성"]));
    expect(children.find((feature) => feature.title === "Instagram/Meta 계정 로그인")?.description).toContain("Instagram 전용 프로필 API 접근은 별도 범위");
  });
});
