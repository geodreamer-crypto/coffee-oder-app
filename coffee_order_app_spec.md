# [기능명세서] Next.js 기반 커피 주문 및 재고 관리 시스템 (v1.0)

* **프로젝트명:** Smart Coffee Order & Inventory System
* **프레임워크:** Next.js (App Router)
* **버전:** v1.0 (비판적 검토 반영 최종 고도화 버전)
* **작성일:** 2026-08-01
* **핵심 강점:** Server Actions 및 데이터베이스 원자적 트랜잭션을 통한 완벽한 재고 동시성 제어, 스냅샷 데이터 무결성 확보, 관리자 보안 인증 및 실시간 오프라인 매장 환경 최적화(준실시간 Polling & Sound Alert)

---

## 1. 기술 스택 (Tech Stack & Architecture)

| 구분 | 기술 / 라이브러리 | 선정 이유 및 실무 최적화 역할 |
| :--- | :--- | :--- |
| **Framework** | **Next.js (App Router)** | 서버 컴포넌트(RSC)를 통한 초고속 초기 렌더링 최적화, Server Actions 및 Route Handlers를 조합한 안전한 백엔드 비즈니스 로직 처리 |
| **Language** | **TypeScript** | 메뉴, 주문, 예외 코드(ErrorCode), DB 스키마 등의 엄격한 강타입 정의로 개발 단계 및 트랜잭션 에러 원천 차단 |
| **Styling** | **Tailwind CSS + Shadcn UI** | 유틸리티 기반의 고가시성 인터페이스 및 반응형 레이아웃 구축 (모바일 바텀시트 및 태블릿 포스기 화면 대응 공통 컴포넌트) |
| **Client State** | **Zustand** | 클라이언트 측 장바구니(`Cart`) 전역 상태를 가볍고 직관적으로 제어하며, 브라우저 `localStorage`와 옵션 동기화 지원 |
| **Server State & Realtime** | **SWR 또는 TanStack Query** | 메뉴 목록(5초 주) 및 관리자 대기열·주문 상태(3초 주기) Polling을 통한 준실시간 동기화 구현 (v1.1 SSE/Supabase Realtime 전환 전제) |
| **Database / ORM** | **PostgreSQL (운영) /<br>SQLite (로컬 개발) + Prisma** | 로컬 및 데모 환경은 SQLite로 기동하되, Vercel 등 서버리스 배포 환경의 read-only 제약 및 데이터 지속성·동시성 보장을 위해 **PostgreSQL 필지 적용** |
| **Authentication & Security** | **Auth.js (NextAuth) /<br>Supabase Auth / PIN Gate** | 관리자 권한(`UserRole = "ADMIN"`) 세션 인가 및 `middleware.ts`를 통한 `/admin/**` 접근 보호, Server Action 2차 보완 권한 검증 |
| **Validation & Error** | **Zod** | 결제 요청, 수량 조절, 관리자 입력 데이터의 서버사이드 유효성 철저 검증 |
| **UI Utilities** | **Lucide-react, Sonner** | 렌더링 성능이 뛰어난 시인성 높은 아이콘 및 재고 품절/주문 실패/성공 등의 Toast 사용자 피드백 제공 |
| **Testing** | **Vitest + Playwright** | 트랜잭션 재고 차감, 멱등성 롤백, 관리자 인가 제어 등 핵심 비즈니스 시나리오 단위 및 E2E 테스트 수행 |

---

## 2. 상세 기능 명세서 (Feature Specifications)

### 2.1 사용자 화면 (Customer UI)

| 기능 ID | 기능명 | 상세 설명 | UI 요소 | 기술 구현 방식 (Next.js & DB) |
| :--- | :--- | :--- | :--- | :--- |
| **CUS-01** | **메뉴 목록 조회 및 갱신** | 카테고리별 활성 메뉴 필터링, 이미지, 단가, 실시간 남은 재고 및 품절 상태 노출 | 카테고리 탭, 메뉴 카드, 품절 뱃지 | Server Component 초기 렌더링 + 클라이언트 **SWR 5초 주기 Polling** (`isActive: true` 레코드 한정 조회) |
| **CUS-02** | **옵션 선택 및 수량 검증** | 핫/아이스 선택(온도 대상 메뉴 한정), 수량 카운터 조절 (재고 상한 초과 방지) | 모바일 바텀시트 / 모달, 수량 제어 컨트롤, 담기 버튼 | Client Component, 수량 증감 클릭 시 현재 서버/캐시된 `stock` 기준 1차 Validation 적용 (초과 시 Toast 경고) |
| **CUS-03** | **장바구니 관리** | 옵션별 구분 장바구니 항목 표현, 수량 조절 및 개별/전체 삭제, 결제 예정액 계산 | 드로어 / 바텀시트, 실시간 가격 Summary | Zustand 전역 상태 (`localStorage` 옵션 저장). 장바구니 가격은 참고 정보이며 결제 시 서버가 가격 재계산 |
| **CUS-04** | **주문 및 Mock 가상결제** | Mock 결제 수단 선택 후 주문 생성 및 DB 트랜잭션 기반 재고 원자적 차감 요청 | 결제 모달, 결제 수단 라디오, 진행 상태 버튼(로딩 Spinner) | **Server Action** 호출. 요청 폼에 **`requestId`(UUID 멱등성 키)** 포함 $\rightarrow$ DB `$transaction` 조건부 재고 차감 및 토큰 발급 |
| **CUS-05** | **주문 상태 실시간 추적** | 비회원 `GuestToken` 매칭을 통한 상태(접수 $\rightarrow$ 제조 $\rightarrow$ 완료 $\rightarrow$ 수령) 확인 및 대기 상태 취소 | 상태 프로그래스 바, 주문 정보 스냅샷, **[주문 취소]** 버튼 | Route Handler GET + **SWR 3초 Polling**. `PENDING` 단계 한정 **[주문 취소]** 클릭 시 Server Action으로 즉시 재고 원복 |

### 2.2 관리자 화면 (Admin UI)

| 기능 ID | 기능명 | 상세 설명 | UI 요소 | 기술 구현 방식 (Next.js & DB) |
| :--- | :--- | :--- | :--- | :--- |
| **ADM-00** | **관리자 인증 및 보안 제어<br>[신규]** | 관리자 권한 보유 세션만 접근 허용, 미인증 접근 시 로그인 페이지 이동 | 관리자 로그인 폼, 로그아웃 버튼, PIN 입력 모달 | `middleware.ts`에서 `/admin/**` 경로 라우팅 가이드, 모든 관리자용 Server Action 실행 시작 지점 권한/세션 재검증 |
| **ADM-01** | **매장 영업 상태 글로벌 제어<br>[신규]** | 매장 온/오프라인 영업 개시 및 임시 중단(마감) 토글 제어 | 상단 헤더 **[영업 중 / 주문 마감]** 토글 스위치 | `StoreSettings` 단일 레코드의 `isOpen` 속성을 토글. `isOpen: false` 시 미들웨어/Layout 단계에서 장바구니 및 주문 진입 차단 |
| **ADM-02** | **실시간 재고 관리** | 전체 메뉴 재고 조회 및 수량 증감(`+`/`-`) 또는 직접 숫자 수치 수정 | 재고 수정 테이블/그리드, 인풋 필드, 품절 경고 셀 | Server Action(`updateStockAction`)으로 Zod 양성 정수 검증 후 DB 업데이트 $\rightarrow$ `mutate` 및 `revalidatePath()`로 화면 즉시 동기화. 3개 이하 품절 임박 경고색 표시 |
| **ADM-03** | **주문 대기열 및 음성 알림** | 접수된 신규 주문 목록 조회 및 상태 단계 전이 처리, **청각적 비프 알림** 발생 | 주문 카드 리스트, 단계별 액션 버튼(`제조시작`, `제조완료`, `수령완료`), 알림 배지 | SWR 3초 주기 Polling 또는 SSE. 이전 카운트 대비 **신규 데이터 인입 감지 시 HTML5 Audio 객체 재생(Sound Alert)** 및 Toast 표출. 상태 전이는 Server Action 호출 처리 |
| **ADM-04** | **주문 취소 및 재고 자동원복** | `PENDING`/`PREPARING` 주문에 대한 전체 취소 및 수량만큼 DB 재고 원자적 복구 | 주문 카드 내 **[주문 취소]** 버튼, 확인 Confirm Dialog | DB `$transaction` 처리: `Order` 상태를 `CANCELLED`로 변경 시도 + 성공 시 연계된 `OrderItem`의 수량만큼 `Menu.stock` 증가 (`increment`). 이미 취소된 건은 차단 |
| **ADM-05** | **메뉴 관리 (CRUD)<br>[신규]** | 신규 메뉴 등록, 정보(단가, 카테고리, 이미지) 수정 및 판매 중단 토글 제어 | 메뉴 관리 테이블, 등록/수정 모달, 활성 토글 | Server Action(`menu-actions.ts`). 기존 주문 데이터의 참조 무결성 보호를 위해 DB 하드 삭제 대신 `isActive = false`로 비활성화 처리 |
| **ADM-06** | **시스템 데이터 초기화** | 테스트 환경에서 재고를 초기값(`initialStock`)으로 복원하거나 주문 이력 삭제 | 개발용 **[재고 초기화]**, **[주문 내역 비우기]** 버튼 | 오작동 차단을 위해 기능 2개로 분리. `process.env.NODE_ENV === "production"` 시 화면 미노출 및 Server Action 실행 철회 |

---

## 3. 핵심 Server Action 트랜잭션 및 동시성 제어 아키텍처

경쟁 상태(Race Condition)를 원천 차단하기 위해, "단순 조회 후 변경"이 아닌 **DB 엔진 수준의 조건부 차감 및 트랜잭션 롤백 매커니즘**을 필수 스펙으로 도입합니다.

### 3.1 주문 생성 및 원자적 재고 차감 (`createOrderAction`)
* **조건부 업데이트 및 스냅샷 보존:** 요청받은 항목을 루프 돌며 `stock >= quantity` 조건절을 충족할 때만 `decrement` 연산을 실행합니다. 조건 미달 시 즉시 에러를 발생시켜 트랜잭션 전체를 자동 Rollback하고 음수 재고를 차단합니다.

```typescript
// src/actions/order-actions.ts (구현 필수 핵심 스펙 예시)
"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ErrorCode } from "@/types/error";

const orderRequestSchema = z.object({
  requestId: z.string().uuid(),
  guestToken: z.string().min(10),
  paymentMethod: z.enum(["CREDIT_CARD", "KAKAO_PAY", "CASH"]),
  items: z.array(z.object({
    menuId: z.string(),
    option: z.enum(["HOT", "ICE"]).optional(),
    quantity: z.number().int().positive(),
  })),
});

export async function createOrderAction(rawPayload: unknown) {
  const parsed = orderRequestSchema.safeParse(rawPayload);
  if (!parsed.success) return { error: "INVALID_QUANTITY" as ErrorCode };
  const { requestId, guestToken, paymentMethod, items } = parsed.data;

  try {
    const createdOrder = await prisma.$transaction(async (tx) => {
      // 1. 멱등성 검증: 동일 requestId 재전송인지 체크
      const existingOrder = await tx.order.findUnique({ where: { requestId } });
      if (existingOrder) return existingOrder;

      // 2. 매장 영업 중 여부 검증
      const store = await tx.storeSettings.findFirst();
      if (!store || !store.isOpen) throw new Error("STORE_CLOSED");

      let calculatedTotal = 0;
      const snapshotItems = [];

      // 3. 각 메뉴별 조건부 재고 원자적 차감 및 정보 조회
      for (const item of items) {
        // 현재 재고가 요청 수량(quantity)보다 크거나 같은 경우에만 decrement 실행! (Race condition 방지)
        const updateResult = await tx.menu.updateMany({
          where: {
            id: item.menuId,
            isActive: true,
            stock: { gte: item.quantity }
          },
          data: {
            stock: { decrement: item.quantity }
          }
        });

        // 차감된 행이 0개라면 재고가 부족하거나 비활성화된 상품이므로 트랜잭션 중단(Rollback 유도)
        if (updateResult.count === 0) {
          throw new Error(`STOCK_NOT_ENOUGH:${item.menuId}`);
        }

        // 스냅샷 보존을 위한 메뉴 최신 단가 및 이름 확인
        const menu = await tx.menu.findUniqueOrThrow({ where: { id: item.menuId } });
        const lineTotal = menu.price * item.quantity;
        calculatedTotal += lineTotal;

        snapshotItems.push({
          menuId: menu.id,
          menuName: menu.name,
          option: item.option,
          quantity: item.quantity,
          unitPrice: menu.price,
          lineTotalAmount: lineTotal
        });
      }

      // 4. 주문 스냅샷 저장
      return await tx.order.create({
        data: {
          orderNo: `ord_${Date.now().toString().slice(-6)}`,
          requestId,
          guestToken,
          status: "PENDING",
          paymentMethod,
          totalAmount: calculatedTotal,
          items: { create: snapshotItems }
        }
      });
    });

    return { success: true, data: createdOrder };
  } catch (error: any) {
    if (error.message?.startsWith("STOCK_NOT_ENOUGH")) return { error: "STOCK_NOT_ENOUGH", details: error.message };
    if (error.message === "STORE_CLOSED") return { error: "STORE_CLOSED" };
    return { error: "INTERNAL_SERVER_ERROR" };
  }
}
```

### 3.2 주문 취소 및 자동 재고 원복 (`cancelOrderAction`)
* **멱등성 및 원복 보장:** 취소 가능한 상태(`PENDING`, `PREPARING`)를 조건절로 지정하여 주문을 `CANCELLED`로 변경하고, 변경에 성공했을 때만 주문 항목에 포함된 수량만큼 재고를 `increment`시킵니다. (중복 클릭 시 `count === 0`으로 차단되어 2중 원복 금지)

```typescript
export async function cancelOrderAction(orderId: string, requestRole: "ADMIN" | "GUEST" = "ADMIN") {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. 취소 가능 상태 필터: GUEST는 PENDING만, ADMIN은 PREPARING까지 허용
      const allowedStatuses = requestRole === "GUEST" ? ["PENDING"] : ["PENDING", "PREPARING"];
      
      const updateOrder = await tx.order.updateMany({
        where: { id: orderId, status: { in: allowedStatuses } },
        data: { status: "CANCELLED", cancelledAt: new Date() }
      });

      // 이미 취소되었거나 수령 완료되어 변경 불가능한 경우 롤백
      if (updateOrder.count === 0) {
        throw new Error("ORDER_CANNOT_BE_CANCELLED");
      }

      // 2. 주문에 담겼던 수량만큼 재고 정확히 복구
      const orderItems = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of orderItems) {
        await tx.menu.update({
          where: { id: item.menuId },
          data: { stock: { increment: item.quantity } }
        });
      }
    });

    return { success: true };
  } catch (error: any) {
    return { error: "ORDER_CANNOT_BE_CANCELLED" as ErrorCode };
  }
}
```

---

## 4. 예외 처리 시나리오 및 표준 오류 코드 (Edge Cases & Error Handling)

### 4.1 핵심 예외 대응 정책
1. **동시성 재고 경합 방지:** 트랜잭션 내 `updateMany` 조건절(`stock: { gte: quantity }`)을 통해 결제 승인 순간의 실제 DB 재고를 판별하며, 음수 재고 진입을 물리적으로 막습니다.
2. **네트워크 단절 및 결제 버튼 연타 보호:** 요청 Payload 내 클라이언트 생성 UUID `requestId`로 중복 생성을 차단하며, 네트워크 재전송 시에도 기존에 처리된 동일 멱등 주문 데이터만 리턴합니다.
3. **사용자 창 종료 후 비회원 세션 복구:** 결제 직후 발급되는 `GuestToken`(또는 `orderNo`)을 `localStorage`에 자동 셋업하고, 앱 초기 진입 시 활성 주문(`PENDING`~`PREPARING`) 존재 시 자동으로 트래킹 UI로 동시 연결합니다.
4. **품절 임박 및 비활성화 메뉴 방어:** 관리자가 판매 중단(`isActive: false`) 처리한 아이템이 장바구니에 남아 결제를 시도할 시 에러 코드 `MENU_NOT_ACTIVE`를 돌려주며 장바구니 업데이트를 요청합니다.

### 4.2 표준 오류 코드 (Standard Error Codes)
서버 에러 발생 시 사용자에게 내부 DB 스택 트레이스를 숨기고 아래 정의된 규정된 표준 Error Code를 구조화하여 반환합니다.

```typescript
// src/types/error.ts
export type ErrorCode =
  | "UNAUTHORIZED"              // 관리자 로그인 필요
  | "FORBIDDEN"                 // 접근 권한 부족
  | "STORE_CLOSED"              // 매장 영업 종료(주문 마감) 상태
  | "MENU_NOT_FOUND"            // 존재하지 않는 메뉴 아이디
  | "MENU_NOT_ACTIVE"           // 판매 중단 처리된 메뉴
  | "INVALID_OPTION"            // 잘못된 온도 옵션 (예: 디저트에 HOT 요청 등)
  | "INVALID_QUANTITY"          // 1 미만 또는 허용 범위를 넘은 비정상 수량
  | "STOCK_NOT_ENOUGH"          // 남은 재고 수량 부족 (동시성 품절 포함)
  | "ORDER_NOT_FOUND"           // 존재하지 않거나 일치하지 않는 주문 식별자
  | "ORDER_ALREADY_EXISTS"      // 중복 요청 ID (requestId 충돌)
  | "INVALID_ORDER_STATUS"      // 허용되지 않은 상태 전이 시도
  | "ORDER_CANNOT_BE_CANCELLED" // 이미 완성되었거나 취소할 수 없는 주문 상태
  | "INTERNAL_SERVER_ERROR";    // 기타 서버 시스템 예외
```

---

## 5. 데이터 모델 (Prisma Schema 실무 확정안)

리뷰어들의 지적을 완벽히 흡수하여 **주문 데이터 스냅샷 보존, 옵션 지원, 비회원 추적, 운영 환경 확장성(Enums 적용) 및 전역 영업 제어 모델**을 합쳐 고도화한 실무급 Prisma 스키마입니다.

```prisma
// schema.prisma
datasource db {
  // 로컬 환경: sqlite / 운영 Vercel 배포: postgresql
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum MenuCategory {
  COFFEE
  NON_COFFEE
  DESSERT
}

enum TemperatureOption {
  HOT
  ICE
}

enum OrderStatus {
  PENDING     // 접수 대기
  PREPARING   // 제조 중
  COMPLETED   // 제조 완료
  PICKED_UP   // 수령 완료
  CANCELLED   // 주문 취소
}

enum PaymentMethod {
  CREDIT_CARD
  KAKAO_PAY
  CASH
}

// 매장 운영 전체 상태 제어를 위한 단일 레코드 모델
model StoreSettings {
  id        Int      @id @default(1)
  isOpen    Boolean  @default(true)
  updatedAt DateTime @updatedAt
}

model Menu {
  id                String       @id @default(cuid())
  name              String
  price             Int
  category          MenuCategory
  stock             Int          @default(0)
  initialStock      Int          @default(0)  // 테스트 초기화 및 기본 재고 복구용 기준값
  lowStockThreshold Int          @default(3)  // 품절 임박 경고 임계값
  imageUrl          String?
  isActive          Boolean      @default(true) // 하드 삭제 금지 (과거 주문 참조 무결성 보호용)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  orderItems        OrderItem[]

  @@index([category, isActive])
}

model Order {
  id            String        @id @default(cuid())
  orderNo       String        @unique          // 고객 UI 표출용 주문 번호 (예: ord_102938)
  requestId     String        @unique          // 중복 결제 및 멱등성 보장 방지용 클라이언트 키
  guestToken    String                         // 비회원 로컬스토리지 매핑용 고유 토큰
  status        OrderStatus   @default(PENDING)
  paymentMethod PaymentMethod
  totalAmount   Int
  cancelledAt   DateTime?
  completedAt   DateTime?
  pickedUpAt    DateTime?
  createdAt     DateTime      @default(now())  // DB UTC 저장 -> 클라이언트 렌더 시 KST 변환
  updatedAt     DateTime      @updatedAt
  items         OrderItem[]

  @@index([status, createdAt])
  @@index([guestToken])
}

model OrderItem {
  id              String             @id @default(cuid())
  orderId         String
  menuId          String
  menuName        String             // 주문 시점의 메뉴명 스냅샷 보존
  option          TemperatureOption? // 선택 옵션 (HOT | ICE, 디저트는 null)
  quantity        Int
  unitPrice       Int                // 주문 시점 단가 스냅샷 보존
  lineTotalAmount Int                // 항목별 총 합산액 (unitPrice * quantity)
  order           Order              @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menu            Menu               @relation(fields: [menuId], references: [id], onDelete: Restrict)

  @@index([orderId])
  @@index([menuId])
}
```

---

## 6. Next.js App Router 확정 디렉터리 구조

권장 리뷰 보고서의 최적화 레이아웃을 기반으로 Route Handler(Polling)와 Server Action(Mutation)의 분리를 담은 추천 파일 아키텍처입니다.

```text
src/
├── app/
│   ├── (customer)/                # 사용자 그룹 라우트 (비회원 Guest 기본)
│   │   ├── page.tsx               # 메인 페이지 (카테고리 탭, 메뉴 목록, 품절 뱃지)
│   │   └── order/
│   │       └── [orderNo]/
│   │           └── page.tsx       # 주문 실시간 추적 페이지 (로컬 스토리지 GuestToken 확인)
│   ├── admin/                     # 관리자 그룹 라우트 (Middleware 및 세션 보호)
│   │   ├── layout.tsx             # 관리자 공통 레이아웃 (상단 영업 중/마감 글로벌 토글 포함)
│   │   ├── page.tsx               # 실시간 주문 대기열 (Sound Alert 오디오 트리거 내장)
│   │   ├── inventory/
│   │   │   └── page.tsx           # 재고 제어 페이지 (직접 숫자 수정, 품절 임박 경고)
│   │   └── menus/
│   │       └── page.tsx           # 메뉴 관리 CRUD 및 판매 중단(isActive) 제어
│   ├── api/                       # SWR Polling 반복 조회를 위한 고유 GET Route Handlers
│   │   ├── menus/
│   │   │   └── route.ts           # 메뉴 및 실시간 재고 5초 주기 조회 API
│   │   ├── orders/
│   │   │   └── [orderNo]/
│   │   │       └── route.ts       # 고객 내 주문 상태 3초 주기 조회 API (guestToken 검증)
│   │   └── admin/
│   │       └── orders/
│   │           └── route.ts       # 관리자 주문 대기열 실시간 3초 주기 조회 API
│   └── layout.tsx                 # 최상위 공통 레이아웃
├── actions/                       # Next.js Server Actions (백엔드 Mutation 트랜잭션)
│   ├── menu-actions.ts            # 메뉴 등록, 수정, 판매 중단 액션
│   ├── inventory-actions.ts       # 수량 조절 및 품절 반영 액션
│   ├── order-actions.ts           # 주문 생성, 고객/관리자 취소, 상태 단계 전이 액션
│   └── store-actions.ts           # 매장 영업 시작/마감 및 테스트 데이터 리셋 액션
├── components/
│   ├── customer/                  # MenuCard, OptionBottomSheet, CartDrawer
│   ├── admin/                     # InventoryTable, OrderCard, SoundAlertManager
│   └── ui/                        # Shadcn UI 공통 모듈 (Dialog, Toast/Sonner, Button)
├── store/
│   └── use-cart-store.ts          # Zustand 장바구니 전역 상태 (localStorage sync)
├── lib/
│   ├── auth.ts                    # 관리자 세션 인가 및 PIN 검증 로직
│   ├── prisma.ts                  # Prisma Client 전역 인스턴스 설정
│   └── errors.ts                  # ErrorCode 변환 및 한국어 핑거프린트 유틸
├── types/
│   ├── menu.ts
│   ├── order.ts
│   └── error.ts                   # 표준 오류 코드 명세서 
├── validators/                    # Zod 입력 데이터 및 요청 체계 검증 스키마
│   ├── order-validator.ts         # 멱등성 및 주문 항목 수량 Zod 스키마
│   └── menu-validator.ts
└── middleware.ts                  # /admin/** 경로 보호 및 영업 종료 차단 게이트웨이
```

---

## 7. 핵심 개발 우선순위 및 테스트 시나리오 (Verification Plan)

### 7.1 개발 로드맵 (Priorities)
* **P0 (개발 착수 전 필수 구축):** Prisma PostgreSQL 스키마 및 Enums 적용, 관리자 세션/PIN 인증 및 미들웨어 가이드, DB 트랜잭션 동시성 차감(`$transaction`) 로직, 스냅샷 보존 셋업, 비회원 `GuestToken` 식별 체계.
* **P1 (v1.0 런칭 필수):** 매장 영업 시작/마감 글로벌 토글 제어, SWR Polling(5초/3초) 및 신규 주문 감지 오디오 알림(Sound Alert), 표준 오류 코드 한국어 Toast, 반응형 바텀시트 및 포스기 그리드 UI.
* **P2 (v1.1 고도화 백로그):** Supabase Realtime / SSE Push 갱신 변환, 관리자 변경 감사 로그(Audit Trail), 메뉴별 개별 옵션 및 추가금 설정, 항목 단위 부분 취소 지원, 실제 KG이니시스/토스 등 PG 실승인 결제 모듈 연동.

### 7.2 핵심 E2E 및 정합성 테스트 시나리오 (Test Cases)
1. **동시성 경합 테스트 (Playwright / Vitest):**
   * 재고가 1개만 남은 `아메리카노` 아이템에 대해 2개 이상의 독립된 클라이언트 세션이 밀리초 차이로 동시 결제를 호출할 경우, 한 건만 성공 처리되고 나머지 세션에는 `STOCK_NOT_ENOUGH` 토스트 오류가 회신되어 재고 잔량이 음수가 되지 않고 0을 정교하게 유지하는지 확인.
2. **주문 취소 멱등성 및 재고 자동 복구 검증:**
   * 고객(`PENDING` 단계) 또는 관리자가 주문 취소를 눌렀을 때 연동된 `OrderItem`의 `quantity`만큼 재고 수량이 즉각 원복되는지 검증. 또한 멀티탭 등에서 2번 연속 취소를 시도해도 최초 취소 외의 조작은 실패 처리되어 수량이 중복 증가하지 않는지 테스트.
3. **보안 인가 및 세션 가이트 확인:**
   * 로그인하지 않은 클라이언트 브라우저로 `/admin` 또는 `/admin/inventory` URL 수동 입력 주입 시 즉시 로그인 폼으로 밀려나는지 체크. Postman을 활용하여 세션 토큰 없이 관리자 전용 Server Action POST 호스팅 호출 시 `UNAUTHORIZED` 오류 반환 여부 확인.
4. **글로벌 영업 종료(마감) 제어 작동 테스트:**
   * 관리자가 매장 영업 상태 토글을 끄면(`isOpen: false`), 고객 모바일 브라우저 화면에 실시간으로 매장 마감 알림 바가 표출되며, 기존 장바구니에서 결제 진행 시도시 `STORE_CLOSED` 에러와 함께 처리가 중단되는지 확인.
5. **서버 측 결제 변조 방어 및 스냅샷 무결성 테스트:**
   * 클라이언트 요청 페이로드 중 임의로 가격 정보를 1원으로 조작하여 API 요청을 보내도, 실제 맺어진 주문 총결제 금액은 서버의 DB 최신 단가로 재정산되어 저장되는지 확인. 관리자가 단가 수정 또는 메뉴명을 변환하더라도 이전 성사된 거래 기록 표출은 스냅샷 명칭과 스냅샷 가격으로 고정 출력되는지 검증.
