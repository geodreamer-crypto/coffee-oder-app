# [기획 검토 보고서] Smart Coffee Order & Inventory System PRD 및 기능명세서 리뷰

**작성일:** 2026년 8월 1일
**검토자:** 20년 차 웹앱 서비스 기획자

---

## 💡 1. 기획자 관점의 비판적 리뷰 (핵심 지적 사항)

기존 작성된 커피 주문 웹앱의 PRD와 기능명세서를 검토한 결과, 전반적인 뼈대와 Next.js(App Router)를 활용한 아키텍처 방향성은 우수합니다. 그러나 실제 카페라는 **오프라인 비즈니스의 특수성**과 **웹 기반 서비스의 한계**를 교차 검증했을 때 몇 가지 치명적인 기획 누락과 데이터 모델의 불일치가 발견되었습니다.

### ① 데이터 모델의 불일치 및 옵션 확장성 부재
* **지적 사항:** PRD의 JSON 데이터 모델 예시에는 `option: "ICE"`가 명시되어 있으나, 기능명세서의 Prisma Schema `OrderItem` 모델에는 옵션 필드가 완전히 누락되어 있습니다. 또한 실제 카페에서는 단순히 핫/아이스뿐만 아니라 '샷 추가, 시럽 추가, 사이즈 업' 등 가격 변동을 동반하는 다중 옵션이 필수입니다.

### ② 주문자 식별 체계(Guest Tracking) 누락
* **지적 사항:** 유저 퍼소나에 회원/비회원 구분이 명시되지 않았습니다. 모바일/웹 환경에서 고객이 가상 결제 후 브라우저 창을 닫아버리면, 자신의 주문(제조 상태)을 다시 확인할 방법이 없습니다. 주문 번호 외에 최소한의 세션 ID나 고객 연락처(또는 주문 비밀번호)를 통한 식별 기준이 필요합니다.

### ③ 매장 운영 상태(Store Status) 제어 기능 부재
* **지적 사항:** 관리자 화면 요구사항에 '실시간 재고 관리'와 '주문 수주'는 있으나, 가장 기본적인 **'영업 시작/종료(영업 임시 중단)'** 기능이 없습니다. 매장이 바쁘거나 마감되었을 때 사용자 화면에서 주문을 전면 차단하는 글로벌 상태 제어가 필수입니다.

### ④ '실시간' 동기화에 대한 기술적 구현의 모순
* **지적 사항:** 관리자 측 실시간 주문 수주 확인을 Server Action과 `revalidatePath`로 처리하겠다고 명시했습니다. 하지만 이는 '사용자의 액션(새로고침 등)'이 있을 때만 화면이 갱신됨을 의미합니다. 카페 주방에서는 태블릿을 가만히 켜두기만 하므로, 새 주문이 들어왔을 때 즉각적인 알림이 오지 않습니다. 폴링(Polling)이나 SSE(Server-Sent Events), 웹소켓 도입이 기능명세서에 반드시 포함되어야 하며, **청각적 알림(Sound Alert)** 기획이 추가되어야 합니다.

### ⑤ 주문 취소 권한의 비대칭성
* **지적 사항:** 관리자에게만 주문 취소 기능이 부여되어 있습니다. 고객이 '접수 대기(PENDING)' 상태일 때 단순 변심이나 조작 실수로 주문을 취소할 수 있는 로직이 없으면 불필요한 매장 클레임으로 이어집니다.

---

## 🛠 2. 수정 및 보완된 기획서 (업데이트 버전)

지적된 사항들을 해결하기 위해 PRD와 기능명세서의 일부를 아래와 같이 수정 및 보완합니다.

### 2.1 [PRD 수정본] 기능 요구사항 추가 및 변경

**3.1 사용자 화면 (Customer UI)**
* **`FR-C05` 실시간 주문 상태 확인 (수정):** 
  * 브라우저를 닫아도 주문을 추적할 수 있도록 기기 로컬 스토리지에 `GuestToken`을 발급하여 저장.
  * 주문 상태가 `접수 대기(PENDING)`인 경우에 한하여 고객이 직접 **[주문 취소]**를 할 수 있는 버튼 제공.

**3.2 관리자 화면 (Admin UI)**
* **`FR-A04` 영업 상태 제어 및 신규 주문 알림 (신규):**
  * 매장 영업 상태 토글 버튼 제공 (영업 중 / 주문 마감). 마감 시 사용자 화면의 장바구니 결제 및 신규 주문 진입 전면 차단.
  * 신규 주문 인입 시 화면 상단에 시각적 알림 팝업과 함께 **청각적 알림(Sound Alert)** 발생.

### 2.2 [PRD 수정본] 예외 처리 시나리오 (Edge Cases) 추가

3. **사용자 이탈 후 재진입 시 주문 상태 복구:**
   * *상황:* 고객이 결제 직후 탭을 닫고 10분 뒤 웹앱에 재진입한 경우.
   * *대응:* 로컬 스토리지의 `GuestToken`과 매칭되는 당일 활성 주문(COMPLETED 이전 상태)이 있다면 홈 화면이 아닌 '주문 상태 확인' 페이지로 리다이렉트.
4. **결제 중 재고 소진 시 트랜잭션 롤백:**
   * *상황:* 다수결제 동시 요청으로 최종 재고가 마이너스가 될 위험이 있는 경우.
   * *대응:* 결제 직전 DB 수준에서 Row Lock을 걸어 검증하고, 실패 시 가상 결제를 취소 처리(Rollback)한 뒤 장바구니로 돌려보냄.

### 2.3 [기능명세서 수정본] 관리자 화면 기술 구현 방식 수정

| 기능 ID | 기능명 | 상세 설명 | UI 요소 | 기술 구현 방식 (Next.js) |
| :--- | :--- | :--- | :--- | :--- |
| **ADM-02** | 주문 대기열 관리 | 접수된 주문 목록을 확인하고 제조 상태 변경 | 주문 카드 리스트, 상태 변경 버튼 | 주문 목록은 **SWR Polling (ex: 5초 주기)** 또는 **SSE**를 사용하여 새로고침 없이 즉시 렌더링. 새 데이터 감지 시 Audio 객체 재생 |
| **ADM-05** | 매장 영업 상태 관리 | 매장의 온/오프라인 상태 제어 | 토글 스위치 | 전역 설정 테이블의 상태값을 변경하여 미들웨어(Middleware) 또는 Layout 수준에서 접속 제어 |

### 2.4 [기능명세서 수정본] 데이터 모델 (Prisma Schema 수정안)

누락되었던 옵션 정보와 유저 식별자, 가격 변동성을 반영하여 스키마를 고도화했습니다.

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model Menu {
  id         String      @id @default(uuid())
  name       String
  basePrice  Int         // price -> basePrice로 명확히 수정
  category   String
  stock      Int         @default(0)
  imageUrl   String?
  isActive   Boolean     @default(true) // 특정 메뉴 숨김 처리용 플래그
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  orderItems OrderItem[]
}

model Order {
  id          String      @id @default(uuid())
  guestToken  String      // 비회원 주문 추적용 고유 토큰 (브라우저 로컬스토리지 매핑)
  status      String      @default("PENDING") // PENDING, PREPARING, COMPLETED, CANCELLED
  totalAmount Int
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  items       OrderItem[]
}

model OrderItem {
  id          String   @id @default(uuid())
  orderId     String
  menuId      String
  quantity    Int
  unitPrice   Int      // 옵션이 포함된 최종 단가 (결제 시점의 가격 스냅샷)
  options     String   // JSON 형태의 문자열로 저장 (예: '{"temperature":"ICE", "shot": 1}') -> SQLite 한계 우회
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menu        Menu     @relation(fields: [menuId], references: [id])
}

// 매장 전역 상태 관리를 위한 단일 레코드 모델 추가
model StoreSettings {
  id          Int      @id @default(1)
  isOpen      Boolean  @default(true)
}
```
