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
  it("지도 클릭 장소 확인과 비용 제한을 기능 노드로 생성한다", () => {
    const features = createDevelopmentFeatureSpec("globeat-project", "Globeat");
    const feature = features.find((item) => item.title === "지도 클릭 주변 장소 자동 확인");
    expect(feature?.status).toBe("done");
    expect(feature?.description).toContain("Nearby Search");
    expect(feature?.acceptanceCriteria.some((criterion) => criterion.description.includes("분당 10회"))).toBe(true);
  });
  it("외부 재생목록 가져오기 정책과 연속 재생 조건을 기록한다", () => {
    const features = createDevelopmentFeatureSpec("globeat-project", "Globeat");
    const feature = features.find((item) => item.title === "외부 플레이리스트 링크 가져오기");
    expect(feature?.status).toBe("in_progress");
    expect(feature?.description).toContain("최대 100곡");
    expect(feature?.description).toContain("멜론");
    expect(feature?.acceptanceCriteria).toHaveLength(5);
    expect(feature?.acceptanceCriteria.some((criterion) => criterion.description.includes("전체 연속 재생"))).toBe(true);
    expect(feature?.acceptanceCriteria.some((criterion) => criterion.description.includes("oEmbed"))).toBe(true);
  });
});
