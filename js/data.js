/* ==========================================================
   KICKS & CUFFS  |  store settings and products
   To make this store for a different seller, edit this file:
   the name, colors, delivery fees, policies and the shoes.
   ========================================================== */

window.STORE = {
  name: "Kicks & Cuffs",
  tagline: "Corporate shoes and sneakers",
  currency: "₦",
  locale: "en-NG",

  // "mock" works now. "monnify" (Nigeria) and "stripe" (international)
  // are added later in js/payment.js and need a small server.
  paymentProvider: "mock",

  // A pair with this many pairs left or fewer shows "Only N left".
  lowStockAt: 3,

  // Delivery. The seller sets their own areas, fees and times.
  // "states" lists which states belong to the area. "rest" means every
  // state not listed in another area.
  deliveryZones: [
    { name: "Lagos", fee: 3500, eta: "1 to 3 working days", states: ["Lagos"] },
    { name: "Abuja (FCT)", fee: 5000, eta: "3 to 5 working days", states: ["FCT (Abuja)"] },
    { name: "Other states", fee: 6500, eta: "3 to 7 working days", states: "rest" }
  ],

  // States you do not deliver to yet. Customers there are told before they send a request.
  // Example: blockedStates: ["Borno", "Yobe"]
  blockedStates: [],

  returnsDays: 7,

  // These show in the footer, contact section, tracking page and the WhatsApp button.
  contact: {
    whatsapp: "2348168001035",   // international format, no plus sign
    phone: "+234 816 800 1035",
    email: "ojodavidoluwadarasimi100@gmail.com",
    address: "",
    hours: "Monday to Saturday, 9am to 6pm"
  }
};

window.STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];

const IMG = (n) => "assets/img/" + n + ".jpg";

window.PRODUCTS = [
  {
    id: "marina-oxford",
    name: "Marina Oxford",
    category: "corporate",
    type: "Cap-toe oxford",
    price: 68500,
    isNew: true,
    tagline: "The shoe for the interview, the board room and the wedding.",
    colors: [
      { name: "Black", hex: "#1B1814", images: [IMG("marina-oxford-side"), IMG("marina-oxford-angle"), IMG("marina-oxford-detail")] },
      { name: "Brown", hex: "#7A4A2B", images: [IMG("marina-oxford-brown")] },
      { name: "Tan", hex: "#B77A3E", images: [IMG("marina-oxford-tan")] }
    ],
    stock: { 39: 0, 40: 5, 41: 4, 42: 6, 43: 2, 44: 3, 45: 0 },
    about: [
      "The oxford is the most formal lace-up shoe a man can wear, and the Marina is our everyday version of it. A cap across the toe, closed lacing and a slim shape keep the line clean under suit trousers or chinos.",
      "Wear it to interviews, office days, weddings and church. Black is the safe answer for suits, brown and tan work well with navy, grey and khaki."
    ],
    features: ["Cap-toe front with fine stitching", "Closed lacing for a sleek, formal line", "Slim, low profile shape", "Available in black, brown and tan"],
    specs: { Style: "Cap-toe oxford", Upper: "Smooth leather finish", Lining: "Soft lining", Sole: "Slim sole with low heel", Closure: "Lace up", Fit: "True to size, slim fit" },
    care: ["Wipe with a soft dry cloth after wearing.", "Polish with a matching cream every few weeks.", "Use a shoe tree or stuffed paper to keep the shape."],
    occasions: ["Job interviews", "Office and meetings", "Weddings", "Church"]
  },
  {
    id: "ikoyi-derby",
    name: "Ikoyi Derby",
    category: "corporate",
    type: "Derby",
    price: 74000,
    isNew: true,
    tagline: "Formal enough for work, relaxed enough for the whole day.",
    colors: [
      { name: "Brown", hex: "#7A4A2B", images: [IMG("ikoyi-derby-side"), IMG("ikoyi-derby-angle"), IMG("ikoyi-derby-detail")] }
    ],
    stock: { 39: 0, 40: 0, 41: 3, 42: 5, 43: 4, 44: 4, 45: 2 },
    about: [
      "A derby has open lacing, which means the sides of the shoe can spread. That makes it more comfortable than an oxford for people with a higher foot, and a little less formal, so it works from Monday to Sunday.",
      "The warm brown leather finish looks good with navy, charcoal and olive. If you only want one brown shoe for work and weekends, this is the one."
    ],
    features: ["Open lacing for extra room across the foot", "Warm brown leather finish", "Cap-toe styling with a clean seam", "Works with trousers, chinos and smart jeans"],
    specs: { Style: "Derby", Upper: "Smooth leather finish", Lining: "Soft lining", Sole: "Hard wearing sole", Closure: "Lace up", Fit: "True to size, regular width" },
    care: ["Brush off dust before it settles in.", "Condition with a leather cream when it starts to look dry.", "Let the shoes rest a day between wears."],
    occasions: ["Office", "Smart casual days", "Dinners", "Travel"]
  },
  {
    id: "balogun-monk",
    name: "Balogun Monk",
    category: "corporate",
    type: "Double monk strap",
    price: 79000,
    isNew: false,
    tagline: "No laces. Two buckles. All the attention.",
    colors: [
      { name: "Dark brown", hex: "#4A2E1F", images: [IMG("balogun-monk-side"), IMG("balogun-monk-angle"), IMG("balogun-monk-detail")] }
    ],
    stock: { 39: 0, 40: 2, 41: 0, 42: 3, 43: 4, 44: 3, 45: 0 },
    about: [
      "Two buckle straps replace the laces on the Balogun. It is quick to put on, sharp to look at, and it sits between formal and stylish, so it stands out in a room full of plain oxfords.",
      "Wear it with a tailored suit, or dress it down with slim trousers and a plain shirt. The metal buckles give it character without shouting."
    ],
    features: ["Double buckle straps, no laces to tie", "Cap-toe front", "Polished metal buckles", "Dark brown finish that suits most outfits"],
    specs: { Style: "Double monk strap", Upper: "Smooth leather finish", Lining: "Soft lining", Sole: "Hard wearing sole with low heel", Closure: "Two buckle straps", Fit: "True to size" },
    care: ["Wipe the buckles with a dry cloth so they stay bright.", "Polish the leather with a matching cream.", "Loosen the straps when you take the shoes off."],
    occasions: ["Business meetings", "Weddings and events", "Smart casual", "Presentations"]
  },
  {
    id: "lekki-loafer",
    name: "Lekki Loafer",
    category: "corporate",
    type: "Penny loafer",
    price: 63000,
    isNew: false,
    tagline: "Slip in, look sharp, and stay cool in the heat.",
    colors: [
      { name: "Black", hex: "#1B1814", images: [IMG("lekki-loafer-side"), IMG("lekki-loafer-angle"), IMG("lekki-loafer-detail")] }
    ],
    stock: { 39: 2, 40: 4, 41: 4, 42: 5, 43: 3, 44: 3, 45: 0 },
    about: [
      "The penny loafer is the easiest smart shoe to wear. No laces, a low shape and a strap across the top with a small slot. It can be worn with or without socks, which is a real advantage in Nigerian weather.",
      "Pair it with suit trousers for the office, or with chinos and a polo on a Friday. Black keeps it formal."
    ],
    features: ["Slip on, no laces", "Classic strap across the top", "Low, light shape for hot days", "Black finish that goes with everything"],
    specs: { Style: "Penny loafer", Upper: "Smooth leather finish", Lining: "Soft lining", Sole: "Flexible sole", Closure: "Slip on", Fit: "True to size, snug at first" },
    care: ["Wipe clean after wet days and let it dry naturally.", "Polish with a black cream.", "Do not fold down the back when slipping in."],
    occasions: ["Office", "Casual Fridays", "Hot weather", "Events"]
  },
  {
    id: "court-low",
    name: "Court Low",
    category: "sneakers",
    type: "Leather low top sneaker",
    price: 52000,
    isNew: true,
    tagline: "The clean white sneaker that goes with absolutely everything.",
    colors: [
      { name: "White", hex: "#F3F3F0", images: [IMG("court-low-side"), IMG("court-low-angle"), IMG("court-low-detail")] },
      { name: "Black", hex: "#1B1814", images: [IMG("court-low-black")] }
    ],
    stock: { 39: 0, 40: 3, 41: 5, 42: 6, 43: 5, 44: 4, 45: 2 },
    about: [
      "No logos, no noise. The Court Low is a plain leather sneaker with a flat sole and a simple profile. It is smart enough to wear with trousers and casual enough for jeans and shorts.",
      "White stays fresh with a quick wipe. The black version hides marks and looks great with all dark outfits."
    ],
    features: ["Clean, logo free design", "Flat sole for an easy, stable walk", "Smooth finish that wipes clean", "White and black options"],
    specs: { Style: "Low top court sneaker", Upper: "Smooth leather finish", Lining: "Soft lining", Sole: "Flat rubber cupsole", Closure: "Lace up", Fit: "True to size" },
    care: ["Wipe the upper with a damp cloth.", "Clean the sole with a soft brush and mild soap.", "Keep away from direct sun when drying."],
    occasions: ["Everyday", "Casual Fridays", "Travel", "Weekends"]
  },
  {
    id: "lagos-runner",
    name: "Lagos Runner",
    category: "sneakers",
    type: "Chunky runner",
    price: 58500,
    isNew: true,
    tagline: "Big sole, bold colors, built for a long day on your feet.",
    colors: [
      { name: "Cream and green", hex: "#2F4A3A", images: [IMG("lagos-runner-side"), IMG("lagos-runner-angle"), IMG("lagos-runner-detail")] }
    ],
    stock: { 39: 0, 40: 0, 41: 1, 42: 4, 43: 5, 44: 4, 45: 3 },
    about: [
      "The Lagos Runner brings the chunky running shoe look to everyday life. A thick, cushioned sole, panels in forest green and cream, and a shape that gets noticed on the street.",
      "It is made for walking, traffic, long days and weekend outings. Wear it with black or olive trousers, or with shorts."
    ],
    features: ["Thick, cushioned sole", "Cream and forest green panels", "Padded collar around the ankle", "Lace up for a secure fit"],
    specs: { Style: "Chunky runner", Upper: "Suede style and smooth panels", Lining: "Breathable lining", Sole: "Thick cushioned sole", Closure: "Lace up", Fit: "True to size, roomy toe" },
    care: ["Brush off dust with a soft brush.", "Spot clean the panels with a damp cloth.", "Keep the suede style panels away from heavy rain."],
    occasions: ["Weekends", "Long walks", "Travel", "Street style"]
  },
  {
    id: "ikeja-high",
    name: "Ikeja High",
    category: "sneakers",
    type: "Leather high top",
    price: 61000,
    isNew: false,
    tagline: "All black, gum sole, and nothing extra.",
    colors: [
      { name: "Black and gum", hex: "#1B1814", images: [IMG("ikeja-high-side"), IMG("ikeja-high-angle"), IMG("ikeja-high-detail")] }
    ],
    stock: { 39: 0, 40: 0, 41: 2, 42: 4, 43: 0, 44: 3, 45: 3 },
    about: [
      "A high top that keeps things simple. Smooth black upper, a padded ankle collar and a warm gum sole that adds a little color without any logos.",
      "It looks great with slim trousers or jeans, and the ankle support makes it comfortable for a full day out."
    ],
    features: ["Padded ankle collar", "Warm gum colored sole", "Smooth black upper with no logos", "Lace up with black laces"],
    specs: { Style: "High top sneaker", Upper: "Smooth leather finish", Lining: "Soft padded lining", Sole: "Flat gum rubber sole", Closure: "Lace up", Fit: "True to size" },
    care: ["Wipe the upper after wearing.", "Scrub the gum sole with a soft brush.", "Stuff with paper when not in use."],
    occasions: ["Everyday", "Weekends", "Cooler evenings", "Street style"]
  },
  {
    id: "surulere-slip",
    name: "Surulere Slip",
    category: "sneakers",
    type: "Slip on sneaker",
    price: 45000,
    isNew: false,
    tagline: "Step in and go. The easiest shoe in the store.",
    colors: [
      { name: "Sand", hex: "#D6C4A8", images: [IMG("surulere-slip-side"), IMG("surulere-slip-angle"), IMG("surulere-slip-detail")] }
    ],
    stock: { 39: 3, 40: 5, 41: 5, 42: 4, 43: 4, 44: 2, 45: 0 },
    about: [
      "A soft sand colored slip on with stretch panels on the sides, so your foot slides in and out without bending down. A light cream sole keeps the look fresh.",
      "It is the shoe for quick errands, travel days and relaxed weekends. It pairs well with shorts, chinos and light trousers."
    ],
    features: ["Slip on with stretch side panels", "Soft sand colored upper", "Light cream sole", "Light and easy for travel"],
    specs: { Style: "Slip on sneaker", Upper: "Soft textured fabric", Lining: "Breathable lining", Sole: "Light flexible sole", Closure: "Slip on with stretch panels", Fit: "True to size" },
    care: ["Brush off dry dirt first.", "Spot clean with a damp cloth and mild soap.", "Air dry away from direct sun."],
    occasions: ["Errands", "Travel", "Weekends", "Hot days"]
  }
];

window.SIZES = [39, 40, 41, 42, 43, 44, 45];

/* Approximate foot length for the size guide. */
window.SIZE_GUIDE = [
  { eu: 39, uk: 6, cm: 24.5 },
  { eu: 40, uk: 6.5, cm: 25.0 },
  { eu: 41, uk: 7.5, cm: 26.0 },
  { eu: 42, uk: 8, cm: 26.5 },
  { eu: 43, uk: 9, cm: 27.5 },
  { eu: 44, uk: 9.5, cm: 28.0 },
  { eu: 45, uk: 10.5, cm: 28.5 }
];

window.SITE_IMAGES = {
  hero: IMG("hero"),
  tileCorporate: IMG("tile-corporate"),
  tileSneakers: IMG("tile-sneakers"),
  office: IMG("lifestyle-office"),
  street: IMG("lifestyle-street"),
  box: IMG("shoe-box")
};
