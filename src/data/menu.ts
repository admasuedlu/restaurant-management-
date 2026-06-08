import { MenuItem } from "../types";

export const menuItems: MenuItem[] = [
  {
    id: "item-1",
    name: "Special Beef Tibs (ስፔሻል ጥብስ)",
    ameName: "ስፔሻል በሬ ጥብስ",
    price: 450,
    category: "Meat",
    description: "Sautéed beef tenderloin cubes with red onions, garlic, jalapeños, rosemary, and authentic clarified butter, served with injera.",
    ameDescription: "ለስላሳ የበሬ ሥጋ ከቀይ ሽንኩርት፣ ነጭ ሽንኩርት፣ ቃሪያ፣ የሮዝመሪ ቅጠል እና ንጥር ቅቤ ጋር ተጠብሶ ከእንጀራ ጋር የሚቀርብ።",
    prepTime: 12,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", // BBQ style
    popularity: 9.8,
    combosSuggestion: {
      name: "Tibs + St. George Combo",
      ameName: "የጥብስና ጊዮርጊስ ኮምቦ",
      price: 510,
      desc: "Save 20 ETB! Special Tibs paired with a cold bottled George Beer.",
      ameDesc: "20 ብር ያድንቁ! ስፔሻል ጥብስ ውድ ከቀዘቀዘ የጊዮርጊስ ቢራ ጋር።"
    }
  },
  {
    id: "item-2",
    name: "Doro Wat (ዶሮ ወጥ)",
    ameName: "ዶሮ ወጥ",
    price: 650,
    category: "Meat",
    description: "The crown jewel of Ethiopian cuisine. Slowly simmered chicken parts in a thick, rich berbere spicy stew, hardboiled eggs, served with injera.",
    ameDescription: "ጥንታዊና ተወዳጅ የኢትዮጵያ ምግብ። በበርበሬ፣ በሽንኩርትና በንጥር ቅቤ ውስጥ ተንተክትኮ የበሰለ ዶሮ ከእንቁላልና እንጀራ ጋር።",
    prepTime: 25,
    image: "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", // Rich stew
    popularity: 9.5,
    combosSuggestion: {
      name: "Feast of Doro Wat & Tej",
      ameName: "የዶሮ ወጥና ጠጅ ግብዣ",
      price: 780,
      desc: "Traditional Doro Wat served alongside a flask of premium Tej Honey Wine.",
      ameDesc: "ዶሮ ወጥ ከማር የተጠመቀ ባህላዊ ጠጅ ጋር ተጣምሮ።"
    }
  },
  {
    id: "item-3",
    name: "Fasting Beyaynetu (የፆም በያይነቱ)",
    ameName: "የፆም በያይነቱ",
    price: 320,
    category: "Fasting",
    description: "An elegant, colorful platter of traditional fasting lentil stews, split pea Alecha, Shiro, collard greens, beetroot, and spicy tomato salad on injera.",
    ameDescription: "ምርጥ ባለቀለም የፆም ምግቦች ድምር። የክክ አልጫ፣ የምስር ወጥ፣ ሽሮ፣ የጎመን አዘገጃጀት፣ ቀይ ስር እና የቲማቲም ሰላጣ በአንድ እንጀራ ላይ።",
    prepTime: 8,
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", // Vegetarian platter
    popularity: 9.7,
    combosSuggestion: {
      name: "Beyaynetu + Avocado Salad Combo",
      ameName: "በያይነቱ ከአቮካዶ ሰላጣ ጋር",
      price: 390,
      desc: "Healthy boost! Full Fasting Beyaynetu plus a freshly prepared spiced Avocado salad.",
      ameDesc: "ጤናማ ምርጫ! ሙሉ የፆም በያይነቱ ከትኩስ አቮካዶ ሰላጣ ጋር።"
    }
  },
  {
    id: "item-4",
    name: "Special Gurage Kitfo (ክትፎ)",
    ameName: "ልዩ የጉራጌ ክትፎ",
    price: 520,
    category: "Meat",
    description: "Finely chopped lean raw beef warmed with spiced clarified butter (Mitmita and Niter Kibe) and cottage cheese (Ayibe), plus seasoned Gomen on side.",
    ameDescription: "በማይክሮፎን የተከተፈ የበሬ ሥጋ ከሚጥሚጣና ከንጥር ቅቤ ጋር ተለውሶ ከአይብና ከጎመን መደርደሪያ ጋር የሚቀርብ።",
    prepTime: 10,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", // Ground meat
    popularity: 9.4
  },
  {
    id: "item-5",
    name: "Shiro Tegabere (ሽሮ ተጋባዥ)",
    ameName: "ሽሮ ተጋባዥ",
    price: 220,
    category: "Fasting",
    description: "Rich, velvety chickpea powder stew cooked with onions, garlic, and special spices, served bubbling hot in a traditional clay pot (Shekla).",
    ameDescription: "በሸክላ ድስት ፈልቶ የሚቀርብ ጣፋጭ ሽሮ። በሽንኩርት፣ ነጭ ሽንኩርት እና በቅመማ ቅመም ተንተክትኮ የሚሰራ።",
    prepTime: 7,
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", // Hot soup / curry
    popularity: 9.6
  },
  {
    id: "item-6",
    name: "Ethiopian Coffee Ceremony (የጀበና ቡና)",
    ameName: "የባህል ጀበና ቡና",
    price: 150,
    category: "Drinks",
    description: "Traditional coffee ceremony starting from pan-roasted Arabica beans, ground by hand, brewed in clay pot, served with popcorn and frankincense.",
    ameDescription: "እዚሁ የሚቆላ፣ የሚወቀጥ እና በጀበና የሚፈላ ትኩስ ቡና ከፈንድሻና ከዕጣን መዓዛ ጋር በባህላዊ መንገድ የሚቀርብ።",
    prepTime: 15,
    image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", // Coffee cup
    popularity: 8.9
  },
  {
    id: "item-7",
    name: "St. George Beer (ጊዮርጊስ ቢራ)",
    ameName: "ቀዝቃዛ ጊዮርጊስ ቢራ",
    price: 80,
    category: "Drinks",
    description: "Cold bottled Ethiopia's favorite lager beer since 1922.",
    ameDescription: "ቀዝቃዛውና አንጋፋው የኢትዮጵያ ተወዳጅ ምርጫ ከመቶ ዓመት በላይ ታሪክ ያለው።",
    prepTime: 1,
    image: "https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", // Cold Beer
    popularity: 9.2
  },
  {
    id: "item-8",
    name: "Shekla Tej (ማር ጠጅ)",
    ameName: "የሸክላ ማር ጠጅ",
    price: 180,
    category: "Drinks",
    description: "Authentic honey wine fermented with Gesho (hops roots) and wild hives honey, served in the traditional Birille flask.",
    ameDescription: "ከንጹህ ማርና ከጌሾ ተመርቶ በብርሌ የሚቀርብ ተወዳጅ ባህላዊ ጠጅ የወይን ጠጅ።",
    prepTime: 2,
    image: "https://images.unsplash.com/photo-1508215885820-4585e56135c8?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", // Honey glass
    popularity: 8.5
  },
  {
    id: "item-9",
    name: "Gastro Baklava Delight (ባቅላቫ)",
    ameName: "ባቅላቫ ኬክ",
    price: 160,
    category: "Dessert",
    description: "Flaky phyllo pastry layers with crushed almonds and local organic honey drizzle.",
    ameDescription: "ጣፋጭ የባቅላቫ ኬክ በማር የተቀላቀለ ለስላሳ አማራጭ።",
    prepTime: 4,
    image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", // Baklava
    popularity: 7.8
  }
];
