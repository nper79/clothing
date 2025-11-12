import type { ExploreLook } from '../types/explore';

const baseFemaleLooks: ExploreLook[] = [
  {
    id: 'f1',
    gender: 'female',
    title: 'Chrome Siren',
    description: 'Liquid metal corset over sheer catsuit with mirrored heels.',
    vibe: 'avant-garde',
    imageUrl: 'https://images.unsplash.com/photo-1524502397800-1e3b6a5ed0c4?auto=format&fit=crop&w=800&q=80',
    prompt: 'Woman wearing chrome-plated corset bustier over sheer black mesh catsuit, mirrored platform heels, slick ponytail, reflective cuffs. Shot inside a mirror-box runway with dramatic spotlight and smoky haze.'
  },
  {
    id: 'f2',
    gender: 'female',
    title: 'Neon Nomad',
    description: 'Iridescent windbreaker with leather harness skirt and boots.',
    vibe: 'future street',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    prompt: 'Full body portrait of a woman in iridescent cropped windbreaker, black patent leather harness skirt over mesh leggings, neon hiking boots, cyberpunk sunglasses. Scene: rainy neon alley with puddle reflections.'
  },
  {
    id: 'f3',
    gender: 'female',
    title: 'Velvet Armor',
    description: 'Structured velvet blazer dress with thigh-high boots.',
    vibe: 'evening power',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
    prompt: 'Woman wearing sculpted emerald velvet blazer dress with exaggerated shoulders, latex gloves, thigh-high patent boots, sleek bob. Shot on a moonlit rooftop with city glow.'
  },
  {
    id: 'f4',
    gender: 'female',
    title: 'Coastal Rebel',
    description: 'Striped resort set with corseted waist and raffia tote.',
    vibe: 'vacation edge',
    imageUrl: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=800&q=80',
    prompt: 'Woman in blue and white striped wrap top and skirt with corseted waist belt, straw tote, gold shell jewelry, lace-up sandals. Scene: sunlit pier with crashing waves.'
  },
  {
    id: 'f5',
    gender: 'female',
    title: 'Prism Runner',
    description: 'Electric athleisure catsuit with latex bomber.',
    vibe: 'sport couture',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    prompt: 'Full body shot of woman wearing electric violet seamless unitard, cropped latex bomber, metallic waist pack, futuristic sneakers. Scene: illuminated tunnel with gradient lights.'
  },
  {
    id: 'f6',
    gender: 'female',
    title: 'Gilded Sheer',
    description: 'Gold mesh gown layered over tailored shorts suit.',
    vibe: 'runway glam',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
    prompt: 'Woman wearing gold chainmail mesh gown layered over ivory tailored shorts suit, crystal choker, strappy heels. Scene: art gallery with marble plinths and warm spotlights.'
  },
  {
    id: 'f7',
    gender: 'female',
    title: 'Sapphire Bloom',
    description: 'Structured floral suit with sheer turtleneck.',
    vibe: 'art house',
    imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=80',
    prompt: 'Woman in cobalt floral jacquard suit, sheer black turtleneck, waist chain, sculptural earrings. Scene: brutalist gallery with oversized canvases.'
  },
  {
    id: 'f8',
    gender: 'female',
    title: 'Terracotta Muse',
    description: 'Cutout column dress with leather harness and gloves.',
    vibe: 'desert luxe',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
    prompt: 'Full body portrait of woman wearing terracotta knit column dress with bold cutouts, tan leather harness belt, opera gloves, braided bun. Scene: sandstone desert at golden hour.'
  },
  {
    id: 'f9',
    gender: 'female',
    title: 'Graphite Dancer',
    description: 'Layered mesh bodysuit with cargo skirt and ballet boots.',
    vibe: 'industrial chic',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    prompt: 'Woman wearing graphite mesh bodysuit, asymmetric cargo skirt, lace-up ballet boots, chrome arm cuffs. Scene: graffiti warehouse with colored smoke.'
  },
  {
    id: 'f10',
    gender: 'female',
    title: 'Aurora Commander',
    description: 'Holographic trench over structured bralette set.',
    vibe: 'futuristic',
    imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80',
    prompt: 'Woman wearing holographic trench coat over structured chartreuse bralette and high-waist trousers, knee boots, visor shades. Scene: glass skybridge with sunrise glow.'
  },
  {
    id: 'f11',
    gender: 'female',
    title: 'Sunlit Linen',
    description: 'Natural linen blazer with relaxed jeans and sandals.',
    vibe: 'weekend chic',
    imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
    prompt: 'Woman wearing oat linen blazer over white ribbed tank, light straight jeans, tan slide sandals, straw market tote. Scene: warm café terrace with plants. Full body, 9:16.'
  },
  {
    id: 'f12',
    gender: 'female',
    title: 'Gallery Denim',
    description: 'Dark denim midi skirt with knit polo and loafers.',
    vibe: 'minimal luxe',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80&sat=-15',
    prompt: 'Full body image of woman in dark denim midi skirt, ivory knit polo, slim belt, polished loafers, structured shoulder bag. Scene: art gallery hallway.'
  },
  {
    id: 'f13',
    gender: 'female',
    title: 'Track Ease',
    description: 'Soft athleisure set with bomber and sneakers.',
    vibe: 'sport casual',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80&sat=-20',
    prompt: 'Woman wearing dusty rose ribbed bra top, matching joggers, lightweight cream bomber, chunky sneakers, low ponytail. Scene: sunlit city rooftop track.'
  }
];

const baseMaleLooks: ExploreLook[] = [
  {
    id: 'm1',
    gender: 'male',
    title: 'Molten Suit',
    description: 'Bronze satin suit with mesh mock-neck and pearls.',
    vibe: 'evening rebel',
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
    prompt: 'Man wearing bronze satin double-breasted suit, sheer black mock-neck top, layered pearl chains, polished loafers. Scene: charcoal painted studio with spotlight ellipse.'
  },
  {
    id: 'm2',
    gender: 'male',
    title: 'Tech Nomad',
    description: 'Layered utility vest over translucent parka and cargo kilt.',
    vibe: 'future utility',
    imageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80',
    prompt: 'Full body portrait of man in charcoal cargo kilt, neoprene leggings, translucent parka, tactical vest, high-top boots. Scene: rain-soaked neon street.'
  },
  {
    id: 'm3',
    gender: 'male',
    title: 'Marble Minimal',
    description: 'Stone-toned knit set with architectural coat.',
    vibe: 'sculptural',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    prompt: 'Man wearing stone gray ribbed knit tee and trousers, off-white architectural overcoat, square-toe boots. Scene: minimalist studio with marble slabs.'
  },
  {
    id: 'm4',
    gender: 'male',
    title: 'Cobalt Alley',
    description: 'Denim corset blazer with leather trousers and gloves.',
    vibe: 'night city',
    imageUrl: 'https://images.unsplash.com/photo-1492447166138-50c3889fccb1?auto=format&fit=crop&w=800&q=80',
    prompt: 'Man wearing cobalt structured blazer with corset lacing, black leather trousers, fingerless gloves, silver chain belt. Scene: moody alley with blue neon.'
  },
  {
    id: 'm5',
    gender: 'male',
    title: 'Voltage Runner',
    description: 'Reflective track suit with sculpted vest.',
    vibe: 'ath-tech',
    imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80',
    prompt: 'Full body image of man in reflective charcoal track suit, sculpted chest vest, utility belt, metallic sneakers. Scene: LED lit tunnel with motion blur.'
  },
  {
    id: 'm6',
    gender: 'male',
    title: 'Desert Monarch',
    description: 'Sand satin robe layered over pleated trousers.',
    vibe: 'luxe wanderer',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    prompt: 'Man wearing sand satin robe with embroidered lapels over ivory pleated trousers, leather sash, stacked necklaces. Scene: desert dunes at sunrise.'
  },
  {
    id: 'm7',
    gender: 'male',
    title: 'Studio Circuit',
    description: 'Panelled jumpsuit with harness straps and combat boots.',
    vibe: 'industrial',
    imageUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=800&q=80',
    prompt: 'Man in charcoal paneled jumpsuit, leather harness straps, combat boots, reflective visor. Scene: steel warehouse with volumetric light shafts.'
  },
  {
    id: 'm8',
    gender: 'male',
    title: 'Iridescent Bard',
    description: 'Sheer turtleneck under metallic poet blouse and pearl belt.',
    vibe: 'romantic edge',
    imageUrl: 'https://images.unsplash.com/photo-1485217988980-11786ced9454?auto=format&fit=crop&w=800&q=80',
    prompt: 'Full body portrait of man wearing sheer black turtleneck under iridescent poet blouse, high-waist trousers, pearl belt, ankle boots. Scene: old theater with velvet drapes.'
  },
  {
    id: 'm9',
    gender: 'male',
    title: 'Graphene Rider',
    description: 'Asymmetric leather jacket with mesh kilt-pants.',
    vibe: 'cyber moto',
    imageUrl: 'https://images.unsplash.com/photo-1495395226200-8fbf6b52bef4?auto=format&fit=crop&w=800&q=80',
    prompt: 'Man wearing matte black asymmetric leather jacket, mesh kilt layered over fitted pants, armored boots, tech gloves. Scene: futuristic parking garage.'
  },
  {
    id: 'm10',
    gender: 'male',
    title: 'Aurora Conductor',
    description: 'Ombre suit with sculpted cape and split-hem trousers.',
    vibe: 'runway luxe',
    imageUrl: 'https://images.unsplash.com/photo-1520975918311-85afcfeaf1af?auto=format&fit=crop&w=800&q=80',
    prompt: 'Full body shot of man in ombre teal-to-lilac suit, sculpted cape, split-hem trousers, patent boots. Scene: glass atrium with colored uplights.'
  },
  {
    id: 'm11',
    gender: 'male',
    title: 'Weekend Layers',
    description: 'Olive chore jacket with striped tee and chinos.',
    vibe: 'casual',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80&sat=-20',
    prompt: 'Man wearing olive canvas chore jacket, navy striped tee, sand chinos, white court sneakers, canvas tote. Scene: outdoor weekend market. Full body 9:16.'
  },
  {
    id: 'm12',
    gender: 'male',
    title: 'Studio Knit',
    description: 'Gray knit polo tucked into pleated trousers.',
    vibe: 'minimal luxe',
    imageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80&sat=-25',
    prompt: 'Full body portrait of man in charcoal knit polo tucked into pleated cream trousers, leather belt, loafers, slim watch. Scene: minimal studio with diffused window light.'
  },
  {
    id: 'm13',
    gender: 'male',
    title: 'Sport Errand',
    description: 'Navy windbreaker, tapered joggers, running shoes.',
    vibe: 'athleisure',
    imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80&sat=-15',
    prompt: 'Man wearing navy windbreaker over stone hoodie, tapered joggers, knit runners, crossbody sling bag. Scene: neighborhood sidewalk with coffee shop.'
  }
];

export const ExploreLookLibrary = {
  getLooks(gender: 'male' | 'female'): ExploreLook[] {
    return gender === 'female' ? baseFemaleLooks : baseMaleLooks;
  }
};
