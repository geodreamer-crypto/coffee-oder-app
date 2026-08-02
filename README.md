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

## 📋 데이터 모델 (Prisma Schema)

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  StoreSettings   │    │      Menu        │    │     Order        │
├─────────────────┤    ├──────────────────┤    ├──────────────────┤
│ id               │    │ id               │    │ id               │
│ isOpen           │    │ name             │    │ orderNo (unique) │
│ updatedAt        │    │ price            │    │ requestId(unique)│
└─────────────────┘    │ category         │    │ guestToken       │
                       │ stock            │    │ status           │
                       │ initialStock     │    │ paymentMethod    │
                       │ lowStockThreshold│    │ totalAmount      │
                       │ imageUrl         │    │ cancelledAt      │
                       │ availableOptions │    │ completedAt      │
                       │ isActive         │    │ pickedUpAt       │
                       │ createdAt        │    │ createdAt        │
                       │ updatedAt        │    │ updatedAt        │
                       └────────┬─────────┘    └────────┬─────────┘
                                │                       │
                                │    ┌──────────────┐   │
                                └────┤  OrderItem   ├───┘
                                     ├──────────────┤
                                     │ id           │
                                     │ orderId (FK) │
                                     │ menuId  (FK) │
                                     │ menuName     │  ← 스냅샷
                                     │ option       │  ← 스냅샷
                                     │ quantity     │
                                     │ unitPrice    │  ← 스냅샷
                                     │ lineTotalAmt │
                                     └──────────────┘
```

---

## 📄 라이선스 및 저작권
© 2026 Coffee Order App Project. All rights reserved.
