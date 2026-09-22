# statkit.franchise.cms.api 디자인 시스템

> shadcn/ui 기반 UI 아이덴티티 가이드. 새 화면·컴포넌트를 만들 때는 이 문서의 규칙을 따른다.
> 최종 갱신: 2026-09-18

> **정책 (2026-09-18~)**: 관리자 화면은 무조건 shadcn 기반(레이어 1 토큰 + shadcn 컴포넌트)으로만 제작한다. 레이어 2의 커스텀 흑백/회색 팔레트는 기존 레거시 화면을 설명하기 위해 남겨둔 기록일 뿐, 새 작업의 기본값이 아니다. 커스텀 스타일은 사용자가 그때그때 명시적으로 지시할 때만 적용한다.

이 문서는 실제 코드(`src/components/ui/`, `src/components/admin/`, `src/app/globals.css`, `components.json`)를 근거로 작성됐다. 문서와 코드가 어긋나면 코드를 우선 신뢰하되, 이 문서도 함께 갱신할 것.

---

## 기술 스택

| 항목            | 값                                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| UI 프리미티브   | shadcn/ui (`components.json`: `style: default`, `baseColor: neutral`, `rsc: true`, `cssVariables: true`) |
| 하부 프리미티브 | Radix UI (`@radix-ui/react-*`)                                                                           |
| 아이콘          | `lucide-react` — 다른 아이콘 세트 혼용 금지                                                              |
| 클래스 병합     | `cn()` = `clsx` + `tailwind-merge` (`@/libs/utils`, `@/lib/utils` 아님)                                  |
| variant 관리    | `class-variance-authority`(cva) — `button.tsx` 참고                                                      |
| 다크모드        | `next-themes`(`attribute="class"`, `defaultTheme="light"`) + Tailwind `darkMode: 'class'`                |
| Tailwind        | v4, `@theme inline` + `tailwind.config.ts` 병행                                                          |
| 폼              | 수동 `useState` + inline 검증이 표준. `react-hook-form`/`zod`는 의존성만 있고 admin CRUD 폼에는 미사용   |
| 웹폰트          | 없음 — Next.js 기본 시스템 폰트 스택 그대로 사용 (`next/font` 미설정)                                    |

새 shadcn 컴포넌트가 필요하면 `npx shadcn@latest add <component>`로 추가한다. 실행 후 **반드시 `git status`로 `package-lock.json`이 생기지 않았는지 확인** — 이 프로젝트는 yarn 전용이라 npm 관련 파일이 생기면 안 된다(CLAUDE.md 규칙). 생겼다면 지우고 `yarn install`로 `yarn.lock`만 갱신한다.

---

## 색상 — 두 레이어가 존재한다 (가장 중요한 부분)

이 저장소는 색 체계가 한 가지가 아니라 **두 레이어**로 나뉘어 있다. 하지만 **기본값은 레이어 1 하나뿐**이다 — 레이어 2는 기존 화면을 유지보수할 때 참고하거나, 사용자가 명시적으로 커스텀을 요청했을 때만 쓴다.

### 레이어 1 — shadcn 토큰 (기본값, 새 작업은 전부 이걸 쓴다)

`src/components/ui/*`(button, input, card, select, dialog, popover, calendar, sonner …)는 `globals.css`의 CSS 변수를 그대로 쓴다: `bg-primary`, `text-foreground`, `border-input`, `bg-popover`, `bg-accent`, `text-muted-foreground`, `bg-destructive` 등. neutral 그레이스케일 베이스, OKLCH 색공간, `--radius: 0.625rem`. 라이트/다크 값은 `:root` / `.dark` 블록에 정의되어 있다.

**새 화면·새 컴포넌트는 전부 이 토큰과 shadcn 컴포넌트(`Button`, `Card`, `Input`, `Select`, `Dialog` 등)를 그대로 쓴다.** 임의 회색값(`gray-100` 등)이나 `bg-black`/`bg-white` 하드코딩을 새로 추가하지 않는다 — 그래야 다크모드가 자동으로 맞고, 일관된 shadcn 아이덴티티가 유지된다.

### 레이어 2 — 레거시 어드민 화면 커스텀 팔레트 (기본값 아님, 참고용)

`FranchiseStoreForm`, `FranchiseMenuForm`, `FranchisePopupForm`, `InquiriesTable`, `EmptyState` 등 일부 기존 어드민 CRUD 화면은 레이어 1 토큰 대신 직접 튜닝한 **흑백 + 회색 팔레트**를 하드코딩해서 쓰고 있다. 이건 **과거에 만들어진 코드의 현재 상태를 기록한 것일 뿐**, 새로 만드는 화면이 따라야 할 기본값이 아니다. 아래 표는 이 레거시 화면들을 유지보수할 때 참고하거나, 사용자가 "이 화면은 커스텀 톤으로 만들어줘"라고 명시적으로 지시했을 때만 사용한다.

| 용도                               | 클래스                                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Primary 액션 버튼 (저장/등록/발행) | `bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-80 transition-opacity`         |
| Secondary/취소 버튼                | `border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700` |
| 카드/섹션 표면                     | `bg-white dark:bg-gray-800`                                                                                            |
| 카드 바깥 테두리                   | `border-gray-100 dark:border-gray-700`                                                                                 |
| 인풋/버튼 테두리                   | `border-gray-200 dark:border-gray-700`                                                                                 |
| 본문 텍스트                        | `text-gray-900 dark:text-gray-100`                                                                                     |
| 보조 텍스트 / placeholder          | `text-gray-400 dark:text-gray-500`                                                                                     |
| Focus 링                           | `focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white`                                               |

상태·카테고리 배지(pill)는 파스텔 톤 색상군을 재사용한다 — **라이트: `bg-{color}-100 text-{color}-700` / 다크: `dark:bg-{color}-900/30 dark:text-{color}-400`**:

| 색상    | 실제 쓰임 예시                    |
| ------- | --------------------------------- |
| blue    | 문의 상태 "신규"                  |
| amber   | 문의 상태 "처리중", 메뉴 "추가금" |
| green   | 문의 상태 "완료", 팝업 "발행"     |
| emerald | 메뉴 "HACCP 인증" 같은 긍정 배지  |
| gray    | 비활성/미발행/기타/중립           |

**규칙 (2026-09-18~)**: 새 어드민 화면(폼·테이블·배지)은 무조건 레이어 1(shadcn 토큰 + shadcn 컴포넌트)로 만든다. `bg-black`/`gray-100` 같은 레이어 2 하드코딩을 새로 추가하지 않는다. 레이어 2 팔레트는 **사용자가 특정 화면에 대해 명시적으로 커스텀을 지시했을 때만** 그 화면에 한해 적용한다 — 지시가 없으면 항상 shadcn 기본값을 따른다. 기존 레거시 화면(`FranchisePopupForm` 등)을 수정할 때도, 사용자가 별도로 "이 화면은 shadcn 기본값으로 바꿔줘"라고 하지 않는 한 기존 톤을 그대로 유지하되(불필요한 리스타일링 지양), 새로 추가하는 부분은 레이어 1로 만든다.

### 레이어 2는 왜 생겼나 (참고, 확정된 사실 아님)

이 저장소엔 이 결정을 설명하는 커밋 메시지나 PR이 남아있지 않다(디렉토리 자체가 git 히스토리 없이 시작됨). "처음부터 의도적으로 커스텀 톤을 설계했다"는 건 확인된 사실이 **아니다** — 단순히 화면마다 필요할 때 즉흥적으로 하드코딩됐을 가능성이 더 크다. 정확한 경위는 알 수 없고, 중요한 것도 아니다. **2026-09-18부터는 origin과 무관하게 레이어 1을 기본값으로 쓴다**는 정책만 확정 사항이다.

---

## Radius(모서리) 컨벤션

**기본값은 shadcn 프리미티브 그대로**(`rounded-md`, `--radius` 기반) — 새 화면은 이걸 건드리지 않고 그대로 쓴다. 아래 `rounded-lg`/`rounded-xl`/`rounded-2xl` 값은 레거시 레이어 2 화면에서만 쓰이는 값이며 참고용으로만 남겨둔다.

| 대상                                             | 클래스                                             |
| ------------------------------------------------ | -------------------------------------------------- |
| shadcn 프리미티브 기본값(Button/Input/Select 등) | `rounded-md`(`--radius` 기반) — **새 작업 기본값** |
| (레거시) 인풋 / 일반 버튼                        | `rounded-lg`                                       |
| (레거시) 카드 / 섹션 / 모달 컨텐츠               | `rounded-xl`                                       |
| (레거시) 배지 / 필 / 토글                        | `rounded-full`                                     |
| (레거시) 빈 상태(EmptyState)                     | `rounded-2xl`                                      |

## 타이포그래피

**기본값은 shadcn/Tailwind 기본 타이포그래피**를 그대로 쓴다. 아래 표는 레거시 레이어 2 화면의 기록이며 새 화면의 기본값이 아니다.

| 용도               | 클래스 (레거시 예시)                                             |
| ------------------ | ---------------------------------------------------------------- |
| 페이지 타이틀      | `text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100` |
| 필드 라벨          | `text-sm font-medium text-gray-700 dark:text-gray-300`           |
| 보조 설명 / 카운트 | `text-xs text-gray-400 dark:text-gray-500`                       |

## 아이콘

`lucide-react`만 사용한다. 사이즈는 인라인 배지·드롭다운 12~~14, 버튼 옆 14~~16 정도로 작게 쓰는 편이며, 장식용 대형 아이콘은 거의 쓰지 않는다.

## 스페이싱 / 레이아웃 패턴

아래는 레거시 레이어 2 폼(`FranchiseStoreForm` 등)의 레이아웃 기록이다. **구조 자체**(모바일 sticky 액션바 + 데스크탑 사이드 액션 패널, 드래그 정렬 + 드롭다운 목록)는 새 화면에서도 유용하면 참고해도 되지만, 실제 구현은 shadcn `Card`/`Button`/`Input` 컴포넌트로 새로 짠다 — 아래 하드코딩된 클래스를 그대로 복사하지 않는다.

- (레거시) 폼 필드 세로 간격: `space-y-5`
- (레거시) 인라인 요소 간격: `gap-1.5` ~ `gap-3`
- (레거시) 카드 패딩: `p-4 sm:p-6`
- (레거시) **폼 레이아웃**: 모바일은 상단 sticky 액션바(취소/저장/발행토글 한 줄), 데스크탑은 `lg:flex-row`로 메인 폼 카드 + 우측 `w-52 shrink-0` sticky 액션 패널. `FranchiseStoreForm`, `FranchiseMenuForm`, `FranchisePopupForm`이 모두 동일 구조를 그대로 복제해서 쓴다.
- (레거시) **목록 테이블**: `bg-white dark:bg-gray-800 rounded-xl border divide-y` — 각 행에 `GripVertical` 드래그 정렬 핸들 + 우측 `MoreVertical` 드롭다운(편집/삭제).

---

## 컴포넌트 인벤토리

**`src/components/ui/`** (shadcn 프리미티브, 레이어 1 토큰 사용 — 새 작업은 항상 이 레이어를 기본으로 쓴다): `button`, `card`, `dialog`, `alert-dialog`(커스텀 wrapper), `confirm-dialog`(커스텀 wrapper), `form`, `input`, `label`, `select`, `sonner`(토스트), `popover`, `calendar`, `date-picker`(Popover+Calendar 조합 커스텀 wrapper — `value`/`onChange`는 `"yyyy-MM-dd"` 문자열. 날짜 필드가 필요하면 네이티브 `<input type="date">` 대신 이걸 쓴다. `className`을 넘기지 않으면 shadcn 기본 스타일 그대로 렌더링된다 — 레거시 화면에서만 `INPUT_CLASS`로 레이어 2 스타일을 덮어씀.)

**`src/components/admin/`** (피처 레벨 — 아래 목록은 레이어 2 아이덴티티를 쓰던 **기존** 컴포넌트 기록. 새로 만드는 피처 컴포넌트는 레이어 1을 기본으로 쓴다. 사용자가 명시적으로 지시한 경우에만 레이어 2 톤을 새로 적용한다): `FranchiseStoreForm`, `FranchiseMenuForm`, `FranchisePopupForm`, `PostForm`, `ProductForm`, `PortfolioForm`, `Sidebar`, `EmptyState`, `ApiConfigCard`, `ApiPagination`, `CopyIdBadge`, `RichEditor`(Tiptap 래퍼), `UserCard`

---

## 새 화면/컴포넌트를 만들 때 체크리스트

- [ ] shadcn 컴포넌트(`Button`, `Card`, `Input`, `Select`, `Dialog` 등)와 레이어 1 토큰(`bg-primary`, `border-input` 등)만 썼는가? (`bg-black`/`gray-100` 같은 레이어 2 하드코딩을 새로 추가하지 않았는가?)
- [ ] 레이어 2 커스텀 톤을 썼다면, 사용자가 그 화면에 대해 명시적으로 지시했기 때문인가? (지시 없이 "어드민이니까 흑백으로"라고 임의 판단하지 않았는가?)
- [ ] 새 아이콘은 `lucide-react`에서만 가져왔는가?
- [ ] 상태/배지가 필요하면 shadcn `Badge` 컴포넌트나 레이어 1 토큰 기반으로 만들었는가? (레이어 2의 blue/amber/green 파스텔 팔레트는 레거시 화면 전용)
- [ ] 여러 화면에서 재사용할 원시 컴포넌트(팝오버, 탭 등)가 필요하면 직접 Radix를 새로 wiring하지 않고 `npx shadcn@latest add`로 추가했는가?
- [ ] `npm` 관련 파일(`package-lock.json`)이 생기지 않았는가?
- [ ] 다크모드(`next-themes` class 토글 기준)에서 실제로 확인했는가?
