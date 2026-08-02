# [검토보고서] Smart Coffee Order & Inventory System PRD/기능명세서 비판적 검토

* **검토 대상:** PRD v1.0, 기능명세서 v1.0
* **검토자 관점:** 20년 경력 웹앱 기획자 (비판적 검토)
* **검토일:** 2026-08-01
* **결론 요약:** 해피패스(Happy Path) 중심 설계 → 동시성, 보안, 데이터 정합성, 실시간성 구현 방식에서 실제 개발 시 구멍 다수 발견. 배포 전 A항목(치명적 결함) 필수 수정 필요.

---

## A. 치명적 결함 (Critical — 반드시 수정)

### A-1. 관리자 인증/보안이 전혀 없음

**문제점**
PRD, 기능명세서 어디에도 관리자 로그인/권한 체크가 없음. `/admin` 경로에 누구나 접근해 재고를 0으로 만들거나 주문을 취소할 수 있음. "재고관리가 핵심 요구사항"이라 명시했으면서 그 화면을 아무나 조작 가능한 것은 치명적 결함.

**수정안**
- `FR-A00`(신규): 관리자 페이지는 로그인 세션 필요 (NextAuth Credentials 또는 최소한 미들웨어 기반 PIN 게이트)
- `middleware.ts`에서 `/admin/**` 경로 보호

---

### A-2. Prisma 스키마와 PRD 데이터 모델이 서로 다름 (구현 불가능한 설계)

**문제점**
- PRD의 `Order.items` 예시에는 `option`, `menuName`, `unitPrice`가 있으나, Prisma `OrderItem`에는 `option` 필드 자체가 없음 → HOT/ICE 옵션 저장 불가
- FR-C02(옵션 선택)는 그대로 존재 → 설계상 구현 불가능한 상태
- `menuName`, `price`를 주문 시점에 스냅샷으로 저장하지 않으면, 이후 관리자가 메뉴명/가격을 바꿀 경우 과거 주문 내역이 왜곡됨 (회계 정합성 문제)

**수정된 Prisma 스키마**
```prisma
model Menu {
  id         String      @id @default(cuid())
  name       String
  price      Int
  category   String
  stock      Int         @default(0)
  isActive   Boolean     @default(true)   // 하드삭제 대신 비활성화 (주문 참조 무결성 보존)
  imageUrl   String?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  orderItems OrderItem[]

  @@index([category])
}

model Order {
  id            String      @id @default(cuid())
  orderNo       String      @unique          // 고객 노출용: ord_20260801_001 형식
  status        String      @default("PENDING")
  totalAmount   Int
  paymentMethod String
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  items         OrderItem[]

  @@index([status])
  @@index([createdAt])
}

model OrderItem {
  id         String   @id @default(cuid())
  orderId    String
  menuId     String
  menuName   String   // 주문 시점 스냅샷 (메뉴 변경/삭제에도 안전)
  option     String?  // "HOT" | "ICE"
  quantity   Int
  unitPrice  Int      // 주문 시점 단가 스냅샷
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menu       Menu     @relation(fields: [menuId], references: [id], onDelete: Restrict)
}
```

> `Order.id`는 내부 PK(cuid), `orderNo`는 고객 노출용 별도 필드로 분리 — PRD 예시(`ord_20260801_001`)와 실제 스키마(UUID)의 불일치를 해결.

---

### A-3. 동시성 처리 방식이 "말"만 있고 "방법"이 없음

**문제점**
"DB 트랜잭션으로 재고 차감"이라고만 적혀 있으나, Race Condition을 막는 실제 조건절이 없음. 두 명이 동시에 마지막 1개를 주문하면 `stock`이 음수가 될 수 있음.

**수정안 (Server Action 로직 명세 추가 필요)**
```ts
// order-actions.ts (핵심 로직 예시)
await prisma.$transaction(async (tx) => {
  for (const item of cartItems) {
    const result = await tx.menu.updateMany({
      where: { id: item.menuId, stock: { gte: item.quantity } }, // 조건부 업데이트
      data: { stock: { decrement: item.quantity } },
    });
    if (result.count === 0) {
      throw new StockError(item.menuName); // 트랜잭션 롤백 유도
    }
  }
  // Order, OrderItem 생성
});
```
FR-C04, ADM-03에 이 원자적 업데이트 방식을 **필수 구현 스펙**으로 명시해야 함.

---

### A-4. "실시간 동기화"가 기술적으로 실시간이 아님

**문제점**
NFR에서 "즉시 반영"을 요구하지만, 구현 방식은 `revalidatePath()`(본인 요청 페이지에만 적용) 또는 "Polling/SWR"임. 관리자가 재고를 0으로 바꿔도 고객 화면에 push되지 않음 → 고객이 새로고침하지 않으면 품절 상품을 계속 담을 수 있음.

**수정안**
- 최소안: 고객 메뉴 화면에 **SWR 3~5초 polling** 명시 적용 (현재는 "또는"으로 모호하게 처리 → 확정 필요)
- 권장안: Supabase Realtime / Pusher / SSE(Route Handler + `EventSource`) 도입, 재고 변경 브로드캐스트
- CUS-05 상태조회도 Server Action이 아니라 **GET Route Handler + SWR polling**으로 수정 (Server Action은 mutation용, 반복 조회에 부적합)

---

### A-5. SQLite + Vercel 배포 조합의 함정

**문제점**
기술스택에 "SQLite(로컬 파일)"을 명시했지만 Vercel 등 서버리스 환경은 파일시스템이 read-only이며 인스턴스마다 초기화됨. 로컬 개발/데모까지는 괜찮지만, "실시간 상태 동기화"가 핵심인 서비스를 SQLite로 배포하면 데이터가 유실되거나 인스턴스 간 불일치가 발생함.

**수정안**
로컬 개발은 SQLite 유지 가능하나, **배포 환경은 Postgres(Supabase/Neon) 필수**로 문서에 명시.

---

## B. 주요 개선사항 (Major)

### B-1. 옵션에 가격 차등이 없음
HOT/ICE만 옵션으로 정의되어 있으나, 실제 카페는 샷 추가/사이즈업/시럽 등 가격이 달라지는 옵션이 필수. 현재 구조로는 옵션별 가격 차등 반영 불가.

**수정 제안 (v1 범위 내 최소 대응)**
```prisma
model MenuOption {
  id        String @id @default(cuid())
  menuId    String
  name      String   // "ICE", "샷추가" 등
  priceDiff Int      @default(0)
  menu      Menu     @relation(fields: [menuId], references: [id])
}
```
※ v1.0 범위를 좁히려면 최소한 "옵션은 가격 영향 없음(HOT=ICE 동일가)"이라고 PRD에 명시적 제약으로 못박아야 함. 현재는 암묵적으로 빠져 있어 개발자가 임의 해석할 위험이 있음.

---

### B-2. 관리자 메뉴 CRUD 부재
ADM-01은 "재고 수정"만 다룸. 신규 메뉴 등록/삭제/가격 수정 기능이 없으면 관리자는 초기 시딩된 메뉴만 영원히 사용해야 함.

**수정안**
`ADM-05 메뉴 등록/수정/비활성화` 추가 (하드 삭제 금지, `isActive` 플래그 처리 — A-2 참고)

---

### B-3. 비로그인 고객의 "내 주문" 식별 방법 미정의
로그인 시스템이 없는데 FR-C05(주문 상태 확인)는 "내 주문"을 어떻게 특정하는지 설명이 없음. 주문 완료 후 브라우저를 닫으면 추적 불가능.

**수정안**
주문 성공 시 `orderNo`를 URL(`/order/[orderNo]`)로 리다이렉트 + `localStorage`에 최근 주문 목록 저장하여 재접속 시 조회 가능하도록 명시.

---

### B-4. 중복 주문(더블클릭/네트워크 재시도) 방지 로직 없음
결제 버튼 연타나 네트워크 재전송 시 동일 주문이 중복 생성될 위험. Idempotency Key 개념이 명세에 없음.

**수정안**
장바구니 제출 시 클라이언트에서 1회용 `requestId` 생성 → 서버에서 중복 요청 차단.

---

### B-5. 관리자 신규 주문 알림(Push/Sound) 부재
실제 매장 운영 시나리오라면 새 주문이 들어왔을 때 관리자가 화면을 계속 보고 있지 않아도 알 수 있어야 함. 현재는 "리스트 조회"만 있어 관리자가 놓칠 수 있음.

**수정안**
ADM-02에 신규 주문 수신 시 알림음 + 배지 카운트 추가.

---

### B-6. "품절 임박" 경고 기준 없음
재고 관리가 핵심 기능인데 "재고 0 = 품절"만 있고, 예를 들어 "재고 3개 이하 시 경고 색상 표시" 같은 운영 편의 기능이 없음.

**수정안 (v1.1 백로그 가능)**
`lowStockThreshold` 필드 및 시각적 경고 추가.

---

## C. 세부 보완 (Minor)

| 항목 | 문제 | 수정 |
|---|---|---|
| `createdAt` 타임존 | `Z`(UTC)로 저장하지만 국내 서비스인데 KST 변환 로직 명시 없음 | UTC 저장 유지 + 클라이언트 렌더링 시 `Asia/Seoul` 변환 명시 |
| ADM-04 리셋 기능 | "재고 초기화"와 "주문 데이터 삭제"가 한 버튼에 묶여 있음 | 두 액션을 분리(재고 리셋 / 주문 이력 초기화)해 오사용 방지 |
| "가상 결제" 정의 | 실제 PG 연동 여부가 모호해 개발 중 스코프 오해 소지 | PRD에 "실제 결제 게이트웨이 미연동, UI 시뮬레이션(Mock)만 처리" 명문화 |
| FR-C02 vs Edge Case #2 | 동일 내용(재고초과 방지)이 본문/예외처리에 중복 기술 | Edge Case 섹션은 FR-C02를 참조하도록 통합 |
| 메뉴 이미지 저장 | `/images/` 로컬 경로 — 배포 시 정적 자산 관리 방식 없음 | Vercel Blob/S3 등 클라우드 스토리지 사용 명시 |
| 주문 부분 취소 | 주문 전체 취소만 가능, 항목 단위 취소 불가 | v1 범위로는 인정 가능하나 "항목 단위 취소는 미지원"이라 명시적 스코프 아웃 처리 필요 |

---

## D. 수정된 PRD 데이터 모델 (최종본)

```json
// Order (수정본)
{
  "id": "cuid_abc123",
  "orderNo": "ord_20260801_001",
  "createdAt": "2026-08-01T14:50:00Z",
  "status": "PREPARING",
  "totalAmount": 8000,
  "paymentMethod": "KAKAO_PAY",
  "items": [
    {
      "menuId": "menu_01",
      "menuName": "아메리카노",
      "option": "ICE",
      "quantity": 2,
      "unitPrice": 4000
    }
  ]
}
```

---

## E. 종합 결론

| 구분 | 현재 상태 | 판단 |
|---|---|---|
| 기능 커버리지 | 고객/관리자 해피패스 위주 | 실무 배포 기준 **미흡** |
| 데이터 모델 정합성 | PRD ↔ Prisma 불일치 존재 | **수정 필수** |
| 동시성/보안 | 원리만 언급, 구체 로직 없음 | **수정 필수** |
| 실시간성 구현 | "즉시 반영" 요구 vs 구현수단 불명확 | **재정의 필요** |
| 배포 아키텍처 | SQLite+서버리스 부조합 | **환경 분리 명시 필요** |

이 문서는 **MVP 데모용으로는 충분**하지만, "실시간 재고 관리가 핵심"이라는 프로젝트 목표를 실제로 달성하려면 A항목(치명적 결함) 5가지는 개발 착수 전에 반드시 확정되어야 함. 특히 **관리자 인증 부재**와 **동시성 처리 로직 미비**는 실서비스 오픈 시 바로 사고로 이어질 수 있는 항목.