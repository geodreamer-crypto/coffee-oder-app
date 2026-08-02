# ☕ Coffee Order App (카페 실시간 주문 및 매장 관리 시스템)

> **Next.js 16 (App Router)** 과 **Prisma ORM 7 + Supabase (PostgreSQL)** 기반으로 구현된 **비회원 실시간 카페 주문 및 매장 통합 관리 웹 애플리케이션**입니다.  
> 세련된 UI/UX와 함께 중복 결제 방지(멱등성), 옵션 커스텀, 무결성을 고려한 스냅샷 설계 등 실무적인 비즈니스 로직을 모두 갖추고 있습니다.

---

## 📖 목차
- [주요 기능](#-주요-기능)
  - [🛍️ 고객 서비스](#️-고객-서비스-customer-flow)
  - [🛡️ 관리자 대시보드](#️-관리자-대시보드-admin-flow)
- [기술 스택](#️-기술-스택)
- [핵심 설계 및 아키텍처](#️-핵심-설계-및-아키텍처)
- [디렉터리 구조](#-디렉터리-구조)
- [시작 안내 및 실행 방법](#-시작-안내-및-실행-방법)
- [환경 변수 설정](#-환경-변수-설정)
- [테스트 및 검증](#-테스트-및-검증)
- [Supabase 데이터베이스 스키마 및 아키텍처](#️-supabase-데이터베이스-스키마-및-아키텍처)

---

## ✨ 주요 기능

### 🛍️ 고객 서비스 (Customer Flow)
1. **비회원 간편 주문 시스템**
   - 별도 회원가입 없이 브라우저 로컬 스토리지 매핑 토큰(`guestToken`)을 활용하여 간편하게 장바구니 및 주문을 관리할 수 있습니다.
2. **카테고리 필터링 및 실시간 재고 확인**
   - 커피(COFFEE), 논커피(NON_COFFEE), 디저트(DESSERT) 카테고리별 탐색이 가능합니다.
   - 품절 임박 상품 및 품절 상품 상태가 UI에 직관적으로 실시간 반영됩니다.
3. **섬세한 음료 옵션 커스텀**
   - 음료별로 허용된 옵션에 따라 **온도(ICE/HOT)**, **샷 추가**, **시럽 추가**, **우유 변경**, **휘핑 크림** 등 디테일한 옵션 커스텀이 가능합니다.
4. **장바구니 및 안전한 결제 프로세스**
   - 신용카드, 카카오페이, 현금 등 다양한 결제 수단을 지원하며, 결제 진행 상태를 시각적으로 보여줍니다.
5. **실시간 주문 현황 트래킹 (`/order/[orderNo]`)**
   - 접수 대기(`PENDING`) ➔ 제조 중(`PREPARING`) ➔ 제조 완료(`COMPLETED`) ➔ 픽업 완료(`PICKED_UP`) 등 진행 단계를 직관적인 타임라인으로 확인할 수 있습니다.

### 🛡️ 관리자 대시보드 (Admin Flow)
관리자 대시보드는 `/admin` 경로에서 접근하며, PIN 인증이 필요합니다.

1. **매장 영업 상태 관리**
   - 대시보드에서 간편하게 매장의 영업 중(ON) / 영업 마감(OFF) 상태를 토글하여 고객의 신규 주문 접수 여부를 제어합니다.
2. **실시간 주문 관리 (KDS & POS 인터페이스)**
   - 신규 접수된 주문 내역을 인체공학적인 레이아웃으로 열람하고 상태 변경(제조 시작, 완료, 픽업, 취소)을 원클릭으로 진행합니다.
3. **메뉴 관리 (`/admin/menus`)**
   - 메뉴의 가격, 이미지, 카테고리 설정은 물론 음료별 허용 옵션을 설정할 수 있습니다.
   - 데이터 참조 무결성을 지키기 위해 완전 삭제(Hard Delete) 대신 비활성화 처리(Soft Delete, `isActive: false`)를 적용합니다.
4. **재고 및 임계값 관리 (`/admin/inventory`)**
   - 실시간 재고량 증감 제어 및 자동 품절 임계값(`lowStockThreshold`), 테스트 및 재고 복구를 위한 기준값(`initialStock`)을 세부 설정합니다.

---

## 🛠️ 기술 스택

### Frontend
| 구분 | 기술 |
|------|------|
| **Framework** | Next.js 16.2 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, tw-animate-css |
| **UI 컴포넌트** | Shadcn UI, Base UI, Lucide React, clsx / tailwind-merge |
| **상태 관리** | Zustand (클라이언트 전역 상태 및 장바구니) |
| **데이터 패칭** | SWR |
| **유효성 검증** | Zod |
| **알림** | Sonner (토스트 알림) |

### Backend & Data
| 구분 | 기술 |
|------|------|
| **API & 로직** | Next.js Server Actions & Route Handlers |
| **ORM** | Prisma ORM 7 (`@prisma/client` + `@prisma/adapter-pg`) |
| **Database** | **Supabase PostgreSQL** (서울 리전, ap-northeast-2) |
| **연결 방식** | PgBouncer (트랜잭션 모드, 포트 6543) + 세션 모드 (포트 5432, 마이그레이션용) |

### Quality & Testing
| 구분 | 기술 |
|------|------|
| **Linter** | ESLint 9 (Flat Config) |
| **Test** | Vitest |

---

## 🏛️ 핵심 설계 및 아키텍처

### 1. 중복 주문 방지 및 멱등성 보장
네트워크 지연 및 중복 클릭으로 인한 다중 결제 문제를 원천 차단하기 위해 주문 요청 시 클라이언트 생성 고유 식별자(`requestId`)를 데이터베이스의 Unique 인덱스로 검증합니다.

### 2. 주문 무결성 및 스냅샷 아키텍처
나중에 메뉴 가격이 오르거나 이름이 바뀌더라도 과거의 주문 내역이 왜곡되지 않도록 주문 생성 시점의 **단가(`unitPrice`)**, **메뉴 이름(`menuName`)**, **선택된 옵션(`option`)**을 `OrderItem` 레코드에 스냅샷으로 영구 기록합니다.

### 3. 데이터 보호 및 Soft-Deletion 패턴
주문이 이미 연관된 메뉴 데이터를 물리적으로 삭제할 경우 외래 키 무결성이 저해되므로, 매장 메뉴는 오직 활성화(`isActive`) 상태만 변경하여 아카이브 안정성을 보장합니다.

### 4. 원자적 재고 차감 (Atomic Stock Decrement)
`prisma.$transaction` 내에서 `updateMany`의 조건부 차감(`stock >= quantity`)을 통해 동시 주문 시에도 재고가 음수로 빠지지 않도록 원자적으로 처리합니다.

### 5. Supabase 이중 연결 구조
| 연결 모드 | 포트 | 용도 |
|-----------|------|------|
| **PgBouncer (트랜잭션 모드)** | 6543 | 런타임 앱 쿼리 (`DATABASE_URL`) |
| **세션 모드 (Direct)** | 5432 | Prisma CLI 마이그레이션/Push (`DIRECT_URL`) |

---

## 📂 디렉터리 구조

```text
coffee-oder-app/
├── prisma/
│   └── schema.prisma          # DB 모델 정의 (PostgreSQL, StoreSettings·Menu·Order·OrderItem)
├── prisma.config.ts            # Prisma CLI 설정 (DIRECT_URL로 DB 연결)
├── src/
│   ├── actions/                # Server Actions (비즈니스 로직)
│   │   ├── order-actions.ts    #   주문 생성·취소·상태 변경
│   │   ├── menu-actions.ts     #   메뉴 CRUD 및 활성화/비활성화
│   │   ├── inventory-actions.ts#   재고 증감 및 설정
│   │   ├── store-actions.ts    #   매장 영업 상태 토글 및 테스트 초기화
│   │   └── auth-actions.ts     #   관리자 PIN 인증
│   ├── app/
│   │   ├── (customer)/         # 고객 라우트 그룹
│   │   │   ├── page.tsx        #   메인 메뉴 목록 페이지
│   │   │   └── order/[orderNo]/#   주문 상태 트래킹 페이지
│   │   ├── admin/              # 관리자 라우트
│   │   │   ├── page.tsx        #   주문 관리 대시보드 (KDS)
│   │   │   ├── menus/          #   메뉴 관리 페이지
│   │   │   ├── inventory/      #   재고 관리 페이지
│   │   │   ├── login/          #   관리자 로그인
│   │   │   └── layout.tsx      #   관리자 공통 레이아웃
│   │   ├── api/                # Route Handlers
│   │   │   ├── menus/          #   메뉴 API
│   │   │   ├── orders/         #   주문 API
│   │   │   └── admin/          #   관리자 API
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   └── globals.css         # 글로벌 스타일
│   ├── components/             # UI 컴포넌트
│   │   ├── ui/                 #   Shadcn UI 기본 컴포넌트
│   │   ├── customer/           #   고객 화면 전용 컴포넌트
│   │   └── admin/              #   관리자 화면 전용 컴포넌트
│   ├── lib/                    # 유틸리티
│   │   ├── prisma.ts           #   Prisma Client 초기화 (PrismaPg 어댑터)
│   │   ├── seed.ts             #   초기 메뉴 데이터 시딩 스크립트
│   │   ├── auth.ts             #   인증 유틸
│   │   ├── options.ts          #   옵션 가격 계산 로직
│   │   ├── errors.ts           #   에러 처리 유틸
│   │   └── utils.ts            #   공통 유틸
│   ├── store/                  # 클라이언트 상태
│   │   └── use-cart-store.ts   #   Zustand 장바구니 스토어
│   ├── types/                  # TypeScript 타입 정의
│   │   ├── menu.ts             #   메뉴 관련 타입
│   │   ├── order.ts            #   주문 관련 타입
│   │   └── error.ts            #   에러 코드 타입
│   ├── validators/             # Zod 검증 스키마
│   │   ├── order-validator.ts  #   주문 요청 검증
│   │   └── menu-validator.ts   #   메뉴·재고 검증
│   └── proxy.ts                # 관리자 라우트 보호 미들웨어
├── tests/                      # Vitest 테스트
├── .env                        # 환경 변수 (Supabase 연결 정보)
└── package.json
```

---

## 🚀 시작 안내 및 실행 방법

### 1. 사전 요구 사항
- **Node.js**: v20.x 이상 권장
- **Supabase 프로젝트**: [Supabase Dashboard](https://supabase.com/dashboard)에서 프로젝트 생성 필요
- **패키지 매니저**: npm, pnpm, 또는 yarn

### 2. 패키지 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
프로젝트 루트의 `.env` 파일에 Supabase 연결 정보를 입력합니다.
```env
# Supabase PostgreSQL — PgBouncer 트랜잭션 모드 (런타임 앱 쿼리용)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase PostgreSQL — 세션 모드 (Prisma CLI 마이그레이션/Push용)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

# 관리자 PIN 번호
ADMIN_PIN="1234"
```

> **💡 Supabase 연결 정보 확인 방법:**  
> Supabase Dashboard → 프로젝트 선택 → 상단 **`Connect`** 버튼 클릭 → **`ORM`** 탭에서 `DATABASE_URL`과 `DIRECT_URL` 복사

### 4. 데이터베이스 스키마 적용 및 초기 데이터 시딩
```bash
# Supabase DB에 테이블 생성
npx prisma db push

# 기본 메뉴 6종 시딩 (아메리카노, 카페라떼, 카라멜 마키아토, 복숭아 아이스티, 말차 라떼, 뉴욕 치즈 케이크)
npm run seed
```

### 5. 개발 서버 실행
```bash
npm run dev
```

서버 구동 후 웹 브라우저에서 아래 경로를 접속할 수 있습니다.
- ☕ **고객 메인 페이지:** [http://localhost:3000](http://localhost:3000)
- ⚙️ **관리자 대시보드:** [http://localhost:3000/admin](http://localhost:3000/admin) (기본 PIN: `1234`)

---

## 🔐 환경 변수 설정

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DATABASE_URL` | Supabase PgBouncer 연결 문자열 (포트 6543) | `postgresql://postgres.xxx:pw@...pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Supabase 세션 모드 연결 문자열 (포트 5432) | `postgresql://postgres.xxx:pw@...pooler.supabase.com:5432/postgres` |
| `ADMIN_PIN` | 관리자 대시보드 접근 PIN | `1234` |

---

## 🧪 테스트 및 검증

본 프로젝트는 핵심 비즈니스 로직의 신뢰성을 보장하기 위해 **Vitest** 기반 테스트 환경이 구성되어 있습니다.

```bash
# 전체 유닛 및 통합 테스트 실행
npm run test

# ESLint 린트 검사
npm run lint

# 프로덕션 빌드
npm run build
```

---

## 🗄️ Supabase 데이터베이스 스키마 및 아키텍처

본 프로젝트는 **Prisma ORM (`@prisma/client` v7)**을 통해 **Supabase PostgreSQL** 데이터베이스 모델을 정의하고 있으며, 무결성과 트랜잭션 안정성(멱등성 보장, 과거 주문 내역 스냅샷, 참조 무결성 보호 등)을 최우선으로 고려한 **4개의 핵심 모델**로 구성되어 있습니다.

### 1. 개체-관계 도표 (ER Diagram)

```mermaid
erDiagram
    StoreSettings {
        int id PK
        boolean isOpen
        datetime updatedAt
    }
    
    Menu {
        string id PK
        string name
        int price
        string category
        int stock
        int initialStock
        int lowStockThreshold
        string imageUrl
        string availableOptions
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }
    
    Order {
        string id PK
        string orderNo UK
        string requestId UK
        string guestToken
        string status
        string paymentMethod
        int totalAmount
        datetime cancelledAt
        datetime completedAt
        datetime pickedUpAt
        datetime createdAt
        datetime updatedAt
    }
    
    OrderItem {
        string id PK
        string orderId FK
        string menuId FK
        string menuName
        string option
        int quantity
        int unitPrice
        int lineTotalAmount
    }

    Order ||--|{ OrderItem : "contains (Cascade)"
    Menu ||--o{ OrderItem : "referenced by (Restrict)"
```

### 2. 테이블별 핵심 설계 분석

#### ① `StoreSettings` (매장 영업 상태)
매장의 오픈/마감 여부를 전역에서 즉각 통제하기 위한 단일 레코드(Singleton) 패턴의 테이블입니다.
- **`id`**: 기본값 `1` 고정 (단일 설정 행으로 유지)
- **`isOpen`**: `true`일 때만 고객이 주문을 진행할 수 있도록 통제하는 플래그

#### ② `Menu` (메뉴 및 재고 관리)
메뉴 정보, 품절 경고 기준, 동적 커스텀 옵션을 관리합니다.
- **`availableOptions` (JSON String)**: 온도(ICE/HOT), 샷, 시럽, 우유 변경 등 **음료별 다양한 선택 옵션 구성**을 JSON 구조화 문자열로 저장하여 NoSQL 수준의 옵션 구성 유연성을 확보합니다.
- **`isActive` (Soft Deletion)**: **논리적 삭제 플래그**. 메뉴 단종 시 물리적 DB 삭제를 차단하여, 해당 메뉴를 주문했던 과거 주문 내역의 **외래 키 참조 무결성**을 안전하게 지킵니다.
- **`lowStockThreshold`**: 품절 임박(예: 3개 이하) 경고를 UI에 실시간 표출하기 위한 임계값입니다.
- **인덱스 전략 (`@@index([category, isActive])`)**: 고객 화면에서 "해당 카테고리의 활성화된 메뉴"만 빠르게 필터링하여 조회 속도를 극대화합니다.

#### ③ `Order` (주문 및 결제 마스터)
주문 결제 금액 및 비회원 식별, 주문 처리 상태를 추적하는 마스터 테이블입니다.
- **`orderNo` (`@unique`)**: 고객 안내용 가독성 좋은 주문번호 (예: `ord_102938`)
- **`requestId` (`@unique`, ⚡ 멱등성 보장 키)**: 네트워크 타임아웃 등으로 사용자가 결제 버튼을 중복 클릭하거나 네트워크 재전송이 발생해도 DB 차원에서 중복 주문 및 결제 처리를 완벽히 방지합니다.
- **`guestToken`**: 비회원 고객이 웹페이지 브라우저 세션(Local Storage)의 토큰을 통해 본인의 주문 내역을 식별하고 트래킹할 수 있도록 매핑하는 키입니다.
- **`status`**: 주문 상태 흐름 (`PENDING` ➔ `PREPARING` ➔ `COMPLETED` ➔ `PICKED_UP` 또는 `CANCELLED`)
- **인덱스 전략**: `@@index([status, createdAt])`(관리자 KDS 대기열 조회 최적화), `@@index([guestToken])`(고객의 내 주문 조회 속도 최적화)

#### ④ `OrderItem` (주문 품목 및 스냅샷 보존)
주문 한 건(`Order`)에 포함된 구체적인 개별 메뉴 구성품 내역을 담는 1:N 테이블입니다.
- **🛡️ 주문 시점 데이터 스냅샷 (`menuName`, `unitPrice`)**: 주문 생성 시점의 메뉴명과 단가를 분리 보존합니다. 훗날 운영자가 메뉴 가격이나 이름을 변경하더라도 **과거 영수증 및 매출 통계가 변조되지 않고 기존 결제액을 그대로 증명**하도록 하는 프로덕션급 모범 설계입니다.
- **외래 키 제약 조건 (`onDelete`)**:
  - `Order` 관계 (`Cascade`): 주문 취소/삭제 시 하위 품목 데이터가 함께 마감됩니다.
  - `Menu` 관계 (`Restrict`): **한 번이라도 주문된 적이 있는 메뉴는 물리적 삭제(Hard Delete)가 DB 단에서 원천 차단**됩니다.

### 3. Supabase 이중 연결 아키텍처 (PgBouncer vs Direct)

서버리스(Next.js) 환경에서 DB 커넥션 풀 고갈(Connection Exhaustion) 방지 및 마이크로 마이그레이션 안정성을 위해 **이중 커넥션 아키텍처**가 적용되어 있습니다.

1. **런타임 앱 쿼리용 (`DATABASE_URL`, 포트 `6543`)**:
   - `pgbouncer=true` 파라미터가 부여된 **PgBouncer Pooler 트랜잭션 모드**를 사용합니다.
   - 대규모 다중 접속 시에도 빠른 TCP 세션 재사용을 위해 `@prisma/adapter-pg`와 네이티브 `pg` 드라이버를 활용합니다.
2. **마이그레이션 CLI용 (`DIRECT_URL`, 포트 `5432`)**:
   - `npx prisma db push` 등 DB 스키마 DDL 실행을 위해 커넥션 풀을 거치지 않는 **Supabase 세션 모드 다이렉트 통신 URL**을 CLI 설정([prisma.config.ts](file:///d:/ybi/vibe_workspace/ch07/coffee-oder-app/prisma.config.ts))에 분리 적용했습니다.

---

## 📄 라이선스 및 저작권
© 2026 Coffee Order App Project. All rights reserved.
