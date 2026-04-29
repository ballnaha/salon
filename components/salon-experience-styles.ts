import type { HairColorOption, HairstyleOption } from '@/components/salon-experience-types';

export const hairstyleOptions: HairstyleOption[] = [
  // ── Male ──────────────────────────────────────────────────────────────────
  {
    id: 'male-low-fade-crop',
    label: 'รองทรงต่ำ (Low Fade Crop)',
    category: 'male',
    description: 'ทรงผู้ชายยอดฮิตในไทย ด้านข้างไล่เฟดต่ำ ด้านบนสั้นมีเท็กซ์เจอร์',
    prompt: 'Apply a low taper fade haircut. The fade is very subtle and low, only at the very bottom of the sideburns and the nape (neckline). Keep the sides and back mostly full, dark, and thick. The top is short with soft piecey texture, styled mostly forward. The overall look should be natural, clean, and conservative, with no high shaved skin on the sides.',
    thumbnail: '/hair-styles/korean-low-taper-v2.png',
  },
  {
    id: 'male-two-block-korean',
    label: 'ทูบล็อกเกาหลี (Two Block)',
    category: 'male',
    description: 'ทรงยอดนิยมในไทย ข้างสั้น ด้านบนมีวอลุ่ม ดูเกาหลีทันสมัย',
    prompt: 'Apply a Korean two-block haircut with shorter sides and back but still some visible side bulk, not shaved to the skin. Keep the top clearly longer and fuller than the sides, with soft natural volume and a slightly tousled Korean salon finish. The shape should show a visible disconnection between the fuller top section and the neater side section. Make it look youthful, modern, and polished.',
    thumbnail: '/hair-styles/korean-two-block.png',
  },
  {
    id: 'male-comma-hair',
    label: 'คอมม่าแฮร์ (Comma Hair)',
    category: 'male',
    description: 'หน้าม้าปัดโค้งสไตล์ไอดอล ทรงนิยมในร้านไทย',
    prompt: 'Apply a comma hair haircut with a clearly visible curved front fringe as the signature feature. The fringe should sweep across the forehead and curl inward on one side like a comma shape, sitting just above one eyebrow. Keep the top softly voluminous and polished, with neat short-to-medium sides and a healthy semi-gloss Korean idol finish.',
    thumbnail: '/hair-styles/korean-comma-hair.png',
  },
  {
    id: 'male-french-crop',
    label: 'เฟรนช์ครอป (French Crop)',
    category: 'male',
    description: 'ทรงสั้นดูแลง่าย ได้ลุคสะอาดคมชัด เหมาะอากาศเมืองไทย',
    prompt: 'Apply a French crop haircut with a short compact top and a straight blunt fringe across the upper forehead as the key feature. Keep the fringe flat, sharp, and clearly horizontal, not parted or swept. The sides and back should be tighter and cleaner than the top, with a low fade or taper. The overall result should feel crisp, tidy, and structured.',
    thumbnail: '/hair-styles/korean-french-crop.png',
  },
  {
    id: 'male-undercut-slick-back',
    label: 'อันเดอร์คัตเสย (Slick Back)',
    category: 'male',
    description: 'ทรงคลาสสิกยอดนิยมในไทย เปิดหน้า ดูมืออาชีพ',
    prompt: 'Apply a slick-back undercut haircut with very short clean sides and back and a clearly longer top. Slick the top straight back away from the forehead with a smooth glossy finish, as if styled with pomade. Keep the forehead fully open and the contrast between the tight sides and sleek top strong and obvious. Do not add a shaved part line unless it appears naturally from the styling.',
    thumbnail: '/hair-styles/korean-slick-back.png',
  },
  {
    id: 'male-high-fade-buzz',
    label: 'รองทรงสูง (High Fade Buzz)',
    category: 'male',
    description: 'เฟดสูงดูหล่อคม เป็นทรงยอดฮิตในกลุ่มนักศึกษาไทย',
    prompt: 'Apply a high skin fade haircut with a short textured top. The sides and back are shaved very high up towards the crown of the head, showing a clear skin fade with high contrast between the skin and the hair. The top remains dark and short with textured volume, creating a sharp, modern, and high-impact masculine silhouette with a very clean, crisp hairline.',
    thumbnail: '/hair-styles/korean-high-fade-v2.png',
  },
  {
    id: 'male-textured-quiff',
    label: 'ควิฟเท็กซ์เจอร์ (Textured Quiff)',
    category: 'male',
    description: 'ด้านบนพองนิดหน่อย มีเท็กซ์เจอร์ ดูเท่ทันสมัย',
    prompt: 'Apply a textured quiff haircut with the front lifted above the forehead to create clear volume at the hairline. Keep the top medium length with matte piecey texture and visible separation, while the sides stay shorter and cleaner with a soft fade. The silhouette should be tallest at the front and flow naturally backward without looking stiff.',
    thumbnail: '/hair-styles/korean-textured-quiff.png',
  },
  {
    id: 'male-bowl-cut-modern',
    label: 'ทรงบาวล์โมเดิร์น (Modern Bowl)',
    category: 'male',
    description: 'ทรงบาวล์เกาหลีที่กำลังฮิตในไทย ขอบตัดเนี้ยบ ดูมินิมอล',
    prompt: 'Apply a modern Korean bowl cut with a smooth rounded dome shape on top and a precise blunt perimeter line wrapping around the head. Keep the top neat, flat, and polished, with the bowl outline clearly visible. The lower sides and back should be much shorter to create a strong contrast under the rounded top section. The result should feel minimal, clean, and fashion-forward.',
    thumbnail: '/hair-styles/korean-modern-bowl.png',
  },
  {
    id: 'male-curtain-hair',
    label: 'ม่านผมชาย (Curtain Hair)',
    category: 'male',
    description: 'ผมยาวกลางแยกกลาง สไตล์เกาหลีนิยมในไทย',
    prompt: 'Apply a men curtain hairstyle with a clean center part and longer front sections falling on both sides of the face like curtains. Let the front pieces frame the cheeks naturally, with medium length hair and soft movement. Keep the sides softer and fuller than a fade. The finish should be relaxed, natural, and Korean-inspired, with light healthy shine and no heavy product.',
    thumbnail: '/hair-styles/korean-curtain-hair.png',
  },
  {
    id: 'male-shaggy-wolf',
    label: 'แชกกี้วูล์ฟ (Shaggy Wolf)',
    category: 'male',
    description: 'ทรงวูล์ฟสำหรับผู้ชาย เลเยอร์เยอะ ดูร็อคแต่ก็สบายตา',
    prompt: 'Apply a men shaggy wolf cut with heavy visible layers, strong texture, and a fuller crown. Keep the top rounder and more voluminous, then let the hair break into wispy feathered ends around the sides and back. Add loose face-framing pieces and a slightly rebellious rock-inspired silhouette. The finish should look airy, natural, and textured rather than sleek.',
    thumbnail: '/hair-styles/korean-shaggy-wolf.png',
  },

  // ── Female ────────────────────────────────────────────────────────────────
  {
    id: 'female-hush-cut',
    label: 'ฮัชคัต (Hush Cut)',
    category: 'female',
    description: 'เลเยอร์เกาหลีทรงฮิตในไทย พลิ้วเบาและดูแพง',
    prompt: 'Apply a professional Korean Hush Cut with soft, airy, and highly textured layers. The length should fall gracefully between the chin and collarbone. Key features include delicate wispy ends that create a lightweight floating effect and soft face-framing layers that blend seamlessly. The overall look should be elegant, voluminous yet airy, with a premium salon finish and natural movement.',
    thumbnail: '/hair-styles/korean-hush-cut.png',
  },
  {
    id: 'female-wolf-cut-soft',
    label: 'วูล์ฟคัตซอฟต์ (Soft Wolf Cut)',
    category: 'female',
    description: 'ทรงฮิตมากในไทยช่วงหลัง เลเยอร์ชัดแต่ยังนุ่มหวาน',
    prompt: 'Apply a Soft Wolf Cut with distinct layered volume at the crown and soft, cascading feathered layers throughout the length. The top should be rounded and full, tapering down to wispy, textured ends around the shoulders. Include soft curtain bangs or face-framing layers that curve gently around the cheekbones. The finish must be romantic, feminine, and textured with natural-looking movement.',
    thumbnail: '/hair-styles/korean-soft-wolf.png',
  },
  {
    id: 'female-lob-c-curl',
    label: 'ล็อบปลายงุ้ม (Lob C-Curl)',
    category: 'female',
    description: 'ทรงประบ่ายอดนิยมในไทย ปลายงุ้มช่วยรับกรอบหน้า',
    prompt: 'Apply a structured Long Bob (Lob) with a precise, high-definition C-Curl at the ends. The mid-lengths should be kept sleek, glossy, and straight to maximize shine. The signature element is the ends, which should be styled with a round brush to create a smooth, deep, inward-curving bounce that cradles the chin and jawline. The hair must appear thick, healthy, and perfectly polished, embodying the sophisticated, minimalist Korean office-chic aesthetic.',
    thumbnail: '/hair-styles/korean-lob-c-curl.png',
  },
  {
    id: 'female-long-s-curl',
    label: 'เลเยอร์ยาวลอนเบา (Long S-Curl)',
    category: 'female',
    description: 'ทรงยอดนิยมในไทย ลุคหวานหรู ดูหนาผมสุขภาพดี',
    prompt: 'Apply long, voluminous hair with clearly defined, large-barrel S-Curl waves cascading down the lengths. The waves are soft, loose, and symmetrical. The hair looks bouncy, touchable, and ultra-glossy, showcasing the quintessential Korean Goddess wave aesthetic. Maintain a clear and polished salon finish.',
    thumbnail: '/hair-styles/korean-long-s-curl.png',
  },
  {
    id: 'female-curtain-bangs',
    label: 'หน้าม้ากลาง (Curtain Bangs)',
    category: 'female',
    description: 'ทรงฮิตในไทย ช่วยบาลานซ์รูปหน้าและเพิ่มความละมุน',
    prompt: 'Apply a medium-to-long hairstyle with soft curtain bangs. The bangs have a clear center part and wispily open away from the forehead, gently framing the eyes and cheekbones. The rest of the hair features soft flattering layers with a natural polished look, emphasizing feminine softness. Premium salon finish.',
    thumbnail: '/hair-styles/korean-curtain-bangs.png',
  },
  {
    id: 'female-bob-classic',
    label: 'บ็อบคลาสสิก (Classic Bob)',
    category: 'female',
    description: 'บ็อบตัดตรงเป็นทรงยืนพื้นยอดนิยมตลอดกาลในไทย',
    prompt: 'Apply a classic blunt bob hairstyle cut exactly at chin level with a perfectly straight heavy perimeter line. The shape is symmetrical, sleek, and geometric, with smooth glossy hair. No visible layers or waves. The bob perfectly frames the face on both sides, looking timeless and tailored. Premium salon finish.',
    thumbnail: '/hair-styles/korean-classic-bob.png',
  },
  {
    id: 'female-pixie-soft',
    label: 'พิกซี่นุ่ม (Soft Pixie)',
    category: 'female',
    description: 'ทรงสั้นดูเก๋ มีเท็กซ์เจอร์นุ่ม กำลังฮิตในร้านไทย',
    prompt: 'Apply a soft feminine pixie cut. The silhouette is short and close to the head but with slightly longer soft, airy texture on top. The sides and nape are neat and tapered, with a delicate soft fringe around the forehead. The look is chic, light, and feminine, completely avoiding a spiky or severe appearance. Premium salon finish.',
    thumbnail: '/hair-styles/korean-soft-pixie.png',
  },
  {
    id: 'female-fluffy-short-bob',
    label: 'บ็อบฟลัฟฟี่ (Fluffy Short Bob)',
    category: 'female',
    description: 'บ็อบสั้นพองฟู สไตล์เกาหลีนิยมในไทย ดูสดใส',
    prompt: 'Apply a fluffy short bob hairstyle with a rounded silhouette ending between the ear and jawline. The hair has soft airy volume, looking full, bouncy, and youthful around the cheeks. The outline is rounded with light movement and a fresh Korean salon finish, appearing delightfully plush. Premium salon finish.',
    thumbnail: '/hair-styles/korean-fluffy-short-bob.png',
  },
  {
    id: 'female-see-through-bangs',
    label: 'หน้าม้าซีทรู (See-Through Bangs)',
    category: 'female',
    description: 'หน้าม้าบางเบา โปร่งแสง กำลังฮิตในไทย',
    prompt: 'Apply a beautiful medium length hairstyle featuring see-through bangs. The bangs are very thin and wispy, lightly covering the forehead while still letting the skin show through. The fringe is soft, airy, and delicate with slight center separation. The rest of the hair is smooth and feminine. Premium salon finish.',
    thumbnail: '/hair-styles/korean-see-through-bangs.png',
  },
  {
    id: 'female-bun-messy',
    label: 'มวยสูงเก๋ (Messy Top Knot)',
    category: 'female',
    description: 'มวยสูงดูเป็นธรรมชาติ สไตล์ฮิตในไทย เหมาะทุกโอกาส',
    prompt: 'Apply a messy high bun hairstyle with the hair gathered at the top of the head into a loose, relaxed top knot. The bun looks intentionally effortless, with soft flyaway pieces and wispy face-framing strands around the temples and cheeks. The impression is casual, chic, and naturally pretty. Premium salon finish.',
    thumbnail: '/hair-styles/korean-messy-bun.png',
  },
];

export const hairColorCategoryInfo: Record<string, { title: string, description: string, image: string }> = {
  'Classic Foundations': {
    title: 'Classic Foundations (สีพื้นมาตรฐาน)',
    description: 'การทำสีผมโทนธรรมชาติแบบสีเดียวทั่วศีรษะ เน้นความเงางามและสุขภาพดี เหมาะสำหรับการปกปิดผมขาวหรือต้องการลุคที่ดูเรียบหรูและเป็นทางการ',
    image: '/examples/classic_foundations_example_1777429234055.png'
  },
  'Luxe Ash & Matte': {
    title: 'Luxe Ash & Matte (โทนหม่นพรีเมียม)',
    description: 'เทคนิคการผสมสีโทนหม่นเทาหรือหม่นเขียว เพื่อช่วยหักล้างเม็ดสีส้ม/แดงในเส้นผม ให้ลุคที่ดูทันสมัย นุ่มนวล สไตล์เกาหลีและญี่ปุ่น',
    image: '/examples/luxe_ash_example_1777429250686.png'
  },
  'Dimensional Highlights': {
    title: 'Dimensional Highlights (ไฮไลท์เพิ่มมิติ)',
    description: 'การทำสีบางส่วนให้สว่างกว่าสีพื้น เพื่อสร้างมิติและการตกกระทบของแสง ทำให้เส้นผมดูมีวอลลุ่ม พริ้วไหว และเห็นลอนผมชัดเจนขึ้น',
    image: '/examples/highlights_example_1777429267474.png'
  },
  'Artistic Balayage': {
    title: 'Artistic Balayage (เทคนิคไล่เฉดศิลปะ)',
    description: 'การไล่เฉดสีจากโคนเข้มไปปลายสว่างแบบไร้รอยต่อ ให้ลุคที่ดูเป็นธรรมชาติและพรีเมียมที่สุด โดยไม่ต้องกังวลเรื่องโคนผมดำที่งอกใหม่',
    image: '/examples/balayage_example_1777429282879.png'
  },
  'Specialty Design': {
    title: 'Specialty Design (เทคนิคดีไซน์เฉพาะจุด)',
    description: 'การออกแบบตำแหน่งสีเฉพาะจุด เช่น Money Piece (กรอบหน้าสว่าง) หรือ Inner Color (สีซ่อนด้านใน) เพื่อแสดงเอกลักษณ์และความคิดสร้างสรรค์',
    image: '/examples/specialty_design_example_1777429299035.png'
  }
};

export const hairColorOptions: HairColorOption[] = [
  // ── 1. Classic Foundations (สีพื้นมาตรฐาน) ────────────────────────────────
  {
    id: 'deep-espresso',
    label: 'Deep Espresso',
    category: 'Classic Foundations',
    swatch: '#1a1414',
    prompt: 'Recolor the hair to a deep, uniform espresso black with a high-gloss salon finish. The hair should look exceptionally healthy, dense, and naturally reflective.',
    descriptionThai: 'สีดำเข้มเอสเพรสโซ่ ให้ลุคที่ดูผมสุขภาพดี หนา และมีความเงางามสูง',
    exampleImage: '/examples/classic_foundations_example_1777429234055.png'
  },
  {
    id: 'warm-mocha',
    label: 'Warm Mocha Brown',
    category: 'Classic Foundations',
    swatch: '#4a3528',
    prompt: 'Apply a rich, warm mocha brown color. Ensure even coverage from roots to ends with subtle chocolate undertones and a silky, luminous texture.',
    descriptionThai: 'สีน้ำตาลมอคค่าโทนอุ่น ให้ความรู้สึกนุ่มนวล เป็นธรรมชาติ และขับผิวให้ดูสว่าง',
    exampleImage: '/examples/classic_foundations_example_1777429234055.png'
  },
  {
    id: 'honey-walnut',
    label: 'Honey Walnut',
    category: 'Classic Foundations',
    swatch: '#7d5c41',
    prompt: 'Recolor the hair to a sophisticated honey walnut brown. A perfect balance of warm and neutral tones with a soft, sun-kissed glow.',
    descriptionThai: 'สีน้ำตาลวอลนัทประกายน้ำผึ้ง มีความสมดุลระหว่างโทนอุ่นและโทนกลาง ดูทันสมัย',
    exampleImage: '/examples/classic_foundations_example_1777429234055.png'
  },

  // ── 2. Luxe Ash & Matte (โทนหม่นพรีเมียม) ──────────────────────────────────
  {
    id: 'mushroom-ash',
    label: 'Mushroom Ash',
    category: 'Luxe Ash & Matte',
    swatch: '#8a837b',
    prompt: 'Apply a professional mushroom ash brown. It should be a cool, muted earthy tone with strong ash reflects and zero brassiness. The finish should be modern and matte.',
    descriptionThai: 'สีน้ำตาลหม่นเทาแบบเห็ด (Mushroom) ยอดนิยม ช่วยลดไรส้มได้ดีเยี่ยม ให้ลุคแมตต์ที่ดูแพง',
    exampleImage: '/examples/luxe_ash_example_1777429250686.png'
  },
  {
    id: 'milk-tea-beige',
    label: 'Milk Tea Beige',
    category: 'Luxe Ash & Matte',
    swatch: '#c4aead',
    prompt: 'Apply the iconic Korean milk tea beige color. A soft, creamy neutral-cool tone that creates an airy, lightweight feel. The hair should look luminous.',
    descriptionThai: 'สีชานมเบจสไตล์เกาหลี ให้ความรู้สึกละมุน อ่อนหวาน และทำให้ผมดูเบาสบาย',
    exampleImage: '/examples/luxe_ash_example_1777429250686.png'
  },
  {
    id: 'mint-ash-green',
    label: 'Mint Ash Green',
    category: 'Luxe Ash & Matte',
    swatch: '#6b705c',
    prompt: 'Recolor the hair to a sophisticated mint ash brown with subtle olive/green undertones to neutralize redness. A very trendy, cool-toned professional look.',
    descriptionThai: 'สีน้ำตาลหม่นเขียวมินต์ ช่วยฆ่าเม็ดสีแดงในเส้นผมได้ดีที่สุด ให้ลุคที่ดูเย็นและชิค',
    exampleImage: '/examples/luxe_ash_example_1777429250686.png'
  },

  // ── 3. Dimensional Highlights (ไฮไลท์เพิ่มมิติ) ─────────────────────────────
  {
    id: 'platinum-baby-lights',
    label: 'Platinum Baby Lights',
    category: 'Dimensional Highlights',
    swatch: 'repeating-linear-gradient(90deg, #1a1414, #1a1414 6px, #e5e5e5 6px, #e5e5e5 9px)',
    prompt: 'Infuse the hair with ultra-fine platinum baby lights over a dark base. These should be extremely thin, delicate highlights that add incredible texture and shimmer.',
    descriptionThai: 'ไฮไลท์เส้นเล็กละเอียดสีพลาตินัม ช่วยเพิ่มมิติให้ผมดูพริ้วไหวเหมือนโดนแสงแดดตลอดเวลา',
    exampleImage: '/examples/highlights_example_1777429267474.png'
  },
  {
    id: 'caramel-lowlights',
    label: 'Caramel Lowlights',
    category: 'Dimensional Highlights',
    swatch: 'repeating-linear-gradient(90deg, #a86f3b, #a86f3b 8px, #3d2b1f 8px, #3d2b1f 16px)',
    prompt: 'Add caramel lowlights to create depth and volume. Mix warm caramel strands with deeper chocolate tones for a multi-tonal, thick-looking hair effect.',
    descriptionThai: 'การทำสีโทนเข้มสลับสีคาราเมล เพื่อสร้างเงาให้ผมดูหนาขึ้นและมีวอลลุ่มอย่างเป็นธรรมชาติ',
    exampleImage: '/examples/highlights_example_1777429267474.png'
  },

  // ── 4. Artistic Balayage & Ombre (เทคนิคไล่เฉดศิลปะ) ───────────────────────
  {
    id: 'sand-blonde-balayage',
    label: 'Sand Blonde Balayage',
    category: 'Artistic Balayage',
    swatch: 'linear-gradient(180deg, #3d2b1f 0%, #d2b48c 100%)',
    prompt: 'Apply a designer sand blonde balayage. Keep roots deep natural brown and seamlessly hand-paint light sand-blonde tones from mid-lengths to ends with a soft gradient.',
    descriptionThai: 'การไล่สีสไตล์บาลาญิาจโทนบลอนด์ทราย ให้โคนเข้มปลายสว่างแบบไร้รอยต่อ ดูหรูหรา',
    exampleImage: '/examples/balayage_example_1777429282879.png'
  },
  {
    id: 'ash-grey-ombre',
    label: 'Ash Grey Ombre',
    category: 'Artistic Balayage',
    swatch: 'linear-gradient(180deg, #1a1414 0%, #8a8d91 100%)',
    prompt: 'Apply a dramatic ash-grey ombre effect. Transition from a dark charcoal root to a light, cool smoky grey at the ends with a clean, professional blend.',
    descriptionThai: 'การไล่สีจากโคนดำไปปลายเทาหม่นแบบ Ombre ให้ลุคที่ดูโฉบเฉี่ยวและมีสไตล์ชัดเจน',
    exampleImage: '/examples/balayage_example_1777429282879.png'
  },

  // ── 5. Specialty Design (เทคนิคดีไซน์เฉพาะจุด) ──────────────────────────────
  {
    id: 'money-piece-highlights',
    label: 'Money Piece (Face Frame)',
    category: 'Specialty Design',
    swatch: 'linear-gradient(90deg, #f5f5dc 20%, #1a1414 20%, #1a1414 80%, #f5f5dc 80%)',
    prompt: 'Apply the "Money Piece" technique. Keep overall hair natural, but add two bold, bright blonde sections strictly framing the face for a high-impact brightening effect.',
    descriptionThai: 'การทำไฮไลท์กรอบหน้า (Money Piece) ช่วยขับใบหน้าให้ดูสว่างและโดดเด่นทันที',
    exampleImage: '/examples/specialty_design_example_1777429299035.png'
  },
  {
    id: 'secret-ash-pink',
    label: 'Secret Inner Color',
    category: 'Specialty Design',
    swatch: 'linear-gradient(135deg, #1a1414 60%, #d993a4 60%)',
    prompt: 'Apply a "Secret Color" effect. Outer layer remains natural espresso, while the inner layers at the nape and ears are colored muted ash-pink. Visible when hair moves.',
    descriptionThai: 'สีซ่อนด้านใน (Secret Color) โทนชมพูหม่น สวยแบบหลบซ่อน จะเห็นชัดเมื่อสะบัดผมหรือมัดผม',
    exampleImage: '/examples/specialty_design_example_1777429299035.png'
  },
  {
    id: 'shadow-root-blonde',
    label: 'Shadow Root Blonde',
    category: 'Specialty Design',
    swatch: 'radial-gradient(circle, #f0e68c 0%, #3d2b1f 100%)',
    prompt: 'Apply a shadow root technique. The roots are kept dark (espresso) and blend quickly into a bright creamy blonde. This creates a lived-in, voluminous look.',
    descriptionThai: 'การทำโคนผมให้ดูมีเงาเข้ม (Shadow Root) ช่วยให้ผมดูมีวอลลุ่มและไม่ต้องเติมโคนบ่อย',
    exampleImage: '/examples/specialty_design_example_1777429299035.png'
  },
];
