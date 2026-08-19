/* ===================== 数据层 ===================== */
/* 13 个食物分类 */
const CATEGORIES = [
  { id: "chicken", name: "鸡肉", emoji: "🍗", tint: "#fdeef0" },
  { id: "pork",    name: "猪肉", emoji: "🥓", tint: "#fbf1f5" },
  { id: "fish",    name: "鱼肉", emoji: "🐟", tint: "#eaf4f4" },
  { id: "shrimp",  name: "虾类", emoji: "🦐", tint: "#eef6f6" },
  { id: "crab",    name: "螃蟹", emoji: "🦀", tint: "#fbf1f5" },
  { id: "squid",   name: "鱿鱼", emoji: "🦑", tint: "#eaf4f4" },
  { id: "veg",     name: "蔬菜", emoji: "🥦", tint: "#eef6f6" },
  { id: "tofu",    name: "豆腐", emoji: "🧈", tint: "#fbf1f5" },
  { id: "egg",     name: "鸡蛋", emoji: "🥚", tint: "#fdeef0" },
  { id: "dimsum",  name: "点心", emoji: "🥟", tint: "#fbf1f5" },
  { id: "bake",    name: "烘培", emoji: "🧁", tint: "#fdeef0" },
  { id: "coffee",  name: "咖啡", emoji: "☕", tint: "#f3ece6" },
  { id: "drink",   name: "饮料", emoji: "🥤", tint: "#eef6f6" },
];

/* 知识页：食材与调味料（名字 / 用法 / 健康知识 / 水彩 emoji）
   group 用于标签页分组 */
const KNOWLEDGE = [
  // ---- 肉类 ----
  { group: "肉类", emoji: "🍗", name: "鸡肉", use: "适合快炒、红烧、炖汤、烤箱烘烤。去皮鸡胸低脂，鸡腿多汁适合红烧。", health: "高蛋白低脂肪，富含 B 族维生素与硒，去皮食用更健康，帮助增肌减脂。", water: "#f6dfe6" },
  { group: "肉类", emoji: "🥩", name: "猪肉", use: "五花肉适合红烧、做馅；里脊嫩滑适合滑炒、糖醋。", health: "提供优质蛋白与铁、锌；肥肉与加工肉建议适量，搭配蔬菜更均衡。", water: "#f7e2e8" },
  { group: "肉类", emoji: "🐟", name: "鱼肉", use: "清蒸保留鲜味，香煎外脆里嫩，亦可做鱼汤、刺身。", health: "富含 Omega-3 与优质蛋白，常吃有益心脑，建议每周 2 次。", water: "#d8ecec" },
  { group: "肉类", emoji: "🦐", name: "虾类", use: "白灼、油焖、蒜蓉蒸皆宜，去虾线更清爽。", health: "低脂高蛋白，含虾青素抗氧；痛风发作期少食。", water: "#e6f3f3" },
  { group: "肉类", emoji: "🦀", name: "螃蟹", use: "清蒸最鲜，蟹粉可入豆腐、年糕。配姜醋驱寒。", health: "高蛋白、微量元素丰富；性寒，体质虚寒者佐姜同食。", water: "#f2e6ea" },
  { group: "肉类", emoji: "🦑", name: "鱿鱼", use: "爆炒、烧烤、焯拌；切花刀更入味好看。", health: "低脂肪高蛋白，含牛磺酸；胆固醇偏高者适量。", water: "#e3f0f0" },

  // ---- 蔬菜豆蛋 ----
  { group: "蔬菜豆蛋", emoji: "🥦", name: "蔬菜", use: "凉拌、快炒、炖煮、做沙拉。深绿叶菜宜大火快炒保色。", health: "膳食纤维与维 C 之王，彩虹搭配不同颜色，营养更全面。", water: "#def0e2" },
  { group: "蔬菜豆蛋", emoji: "🧈", name: "豆腐", use: "麻婆、红烧、味噌汤、凉拌。北豆腐耐煮，嫩豆腐适汤。", health: "植物蛋白与钙的好来源，大豆异黄酮对女性友好。", water: "#f3eee6" },
  { group: "蔬菜豆蛋", emoji: "🥚", name: "鸡蛋", use: "水煮、煎、炒、蒸蛋羹、做烘焙。常温易熟，冷藏更保鲜。", health: "完美蛋白＋卵磷脂，每天 1 个很合适，蛋黄营养密度高。", water: "#f7ede3" },

  // ---- 面点与甜 ----
  { group: "面点与甜", emoji: "🥟", name: "点心", use: "蒸饺、烧麦、包子、汤圆。皮薄馅大，蒸制最省油。", health: "主食类提供碳水能量；搭配蔬菜馅与少油做法更轻盈。", water: "#f6e7ee" },
  { group: "面点与甜", emoji: "🧁", name: "烘培", use: "蛋糕、曲奇、面包。注意称量准确、烤箱预热与温度。", health: "享受甜点的快乐，控制糖油比例，偶尔犒赏刚刚好。", water: "#f8e8ef" },

  // ---- 饮品 ----
  { group: "饮品", emoji: "☕", name: "咖啡", use: "手冲、意式、冷萃。现磨豆风味更佳，注意水温与粉水比。", health: "含咖啡因提神、抗氧化物丰富；下午晚些时候少喝以免影响睡眠。", water: "#ece2da" },
  { group: "饮品", emoji: "🥤", name: "饮料", use: "自制果茶、气泡水、燕麦奶。少糖更健康，现做现喝。", health: "多喝水、少添加糖；自制饮品控糖又新鲜。", water: "#e6f2f2" },

  // ---- 调味料 ----
  { group: "调味料", emoji: "🧂", name: "盐", use: "百味之首，出锅前少撒提鲜；腌制、调味皆可用。", health: "每日≤5g，高血压人群更需控量，可用香草替代部分盐。", water: "#eef0f0" },
  { group: "调味料", emoji: "🫒", name: "橄榄油", use: "凉拌、低温煎炒、蘸面包。特级初榨风味最佳。", health: "单不饱和脂肪护心，低温使用保留营养，烟点有限勿猛火。", water: "#eef2e4" },
  { group: "调味料", emoji: "🧄", name: "蒜", use: "爆香、蒜蓉蒸、凉拌。拍碎静置更出蒜素。", health: "含大蒜素，助免疫与心血管；生蒜更浓，熟蒜更甜。", water: "#f0f1e8" },
  { group: "调味料", emoji: "🫚", name: "姜", use: "去腥、驱寒、煲汤。拍姜更易出味。", health: "温性食材，助消化驱寒；海鲜配姜更安心。", water: "#f3ece0" },
  { group: "调味料", emoji: "🍯", name: "蜂蜜", use: "腌肉上色、调饮、烘焙替代糖。温水冲泡不破坏酶。", health: "天然甜味与抗氧化物；1 岁以下婴儿禁食，控量享用。", water: "#f8eccf" },
  { group: "调味料", emoji: "🍶", name: "酱油", use: "生抽调味、老抽上色。点蘸、红烧、凉拌皆宜。", health: "钠含量不低，减盐版更健康；与糖醋搭出复合味。", water: "#ece6df" },
];

/* 宠物阶段（积分驱动） */
const PET_STAGES = [
  { min: 0,   emoji: "🐤", stage: "雏鸟" },
  { min: 30,  emoji: "🐥", stage: "小雏" },
  { min: 80,  emoji: "🐣", stage: "学飞" },
  { min: 160, emoji: "🐤🍳", stage: "小厨" },
  { min: 300, emoji: "👩‍🍳", stage: "厨师" },
  { min: 600, emoji: "👩‍🍳✨", stage: "大厨" },
  { min: 1000,emoji: "👑🍳", stage: "厨神" },
];

window.APP_DATA = { CATEGORIES, KNOWLEDGE, PET_STAGES };
