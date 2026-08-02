import { prisma } from './prisma';

async function main() {
  console.log("Seeding started...");

  // 1. StoreSettings 초기화
  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      isOpen: true,
    },
  });

  // 2. 초기 메뉴 시딩 (6종) 및 옵션 설정
  const menus = [
    {
      name: "아메리카노",
      price: 4000,
      category: "COFFEE",
      stock: 15,
      initialStock: 15,
      lowStockThreshold: 3,
      imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80",
      availableOptions: JSON.stringify({
        temperatures: ["ICE", "HOT"],
        shots: true,
        syrup: true,
        milk: false,
        whippedCream: false,
      }),
      isActive: true,
    },
    {
      name: "카페라떼",
      price: 4500,
      category: "COFFEE",
      stock: 10,
      initialStock: 10,
      lowStockThreshold: 3,
      imageUrl: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=600&q=80",
      availableOptions: JSON.stringify({
        temperatures: ["ICE", "HOT"],
        shots: true,
        syrup: true,
        milk: true,
        whippedCream: false,
      }),
      isActive: true,
    },
    {
      name: "카라멜 마키아토",
      price: 5000,
      category: "COFFEE",
      stock: 8,
      initialStock: 8,
      lowStockThreshold: 3,
      imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80",
      availableOptions: JSON.stringify({
        temperatures: ["ICE", "HOT"],
        shots: true,
        syrup: false,
        milk: true,
        whippedCream: true,
      }),
      isActive: true,
    },
    {
      name: "복숭아 아이스티",
      price: 4000,
      category: "NON_COFFEE",
      stock: 20,
      initialStock: 20,
      lowStockThreshold: 5,
      imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
      availableOptions: JSON.stringify({
        temperatures: ["ICE"],
        shots: false,
        syrup: false,
        milk: false,
        whippedCream: false,
      }),
      isActive: true,
    },
    {
      name: "말차 라떼",
      price: 5000,
      category: "NON_COFFEE",
      stock: 12,
      initialStock: 12,
      lowStockThreshold: 3,
      imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
      availableOptions: JSON.stringify({
        temperatures: ["ICE", "HOT"],
        shots: true,
        syrup: false,
        milk: true,
        whippedCream: true,
      }),
      isActive: true,
    },
    {
      name: "뉴욕 치즈 케이크",
      price: 6000,
      category: "DESSERT",
      stock: 5,
      initialStock: 5,
      lowStockThreshold: 2,
      imageUrl: "https://images.unsplash.com/photo-1524351199678-941a58a3df50?auto=format&fit=crop&w=600&q=80",
      availableOptions: null,
      isActive: true,
    },
  ];

  for (const menu of menus) {
    const exists = await prisma.menu.findFirst({
      where: { name: menu.name },
    });
    if (!exists) {
      await prisma.menu.create({ data: menu });
    } else {
      await prisma.menu.update({
        where: { id: exists.id },
        data: { availableOptions: menu.availableOptions },
      });
    }
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
