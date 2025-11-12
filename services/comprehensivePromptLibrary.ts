import type { Answers } from '../types';

export interface ComprehensiveLook {
  id: string;
  name: string;
  category: string;
  level: 'conservador' | 'intermedio' | 'experimental' | 'especifico';
  formality: 'formal' | 'smart-casual' | 'casual' | 'edgy';
  prompt: string;
  tags: string[];
}

export class ComprehensivePromptLibrary {
  // ===== HOMEM - 20 LOOKS =====

  private static readonly MALE_LOOKS: ComprehensiveLook[] = [
    // CONSERVADORES (5 looks)
    {
      id: 'male_business_formal',
      name: 'Terno Executivo Azul Marinho',
      category: 'Corporate Formal',
      level: 'conservador',
      formality: 'formal',
      prompt: 'Man with professional male model in full navy blue wool suit with notch lapel, crisp white cotton dress shirt with spread collar, burgundy silk tie with subtle pattern, black leather oxford cap-toe shoes, silver classic wristwatch, standing in modern office setting, natural lighting, clean background, full body shot, corporate executive style, perfectly tailored fit, polished and sophisticated appearance, single person only, solo portrait',
      tags: ['ternos', 'executivo', 'formal', 'trabalho', 'conservador']
    },
    {
      id: 'male_business_conservative',
      name: 'Business Conservativo',
      category: 'Business Conservative',
      level: 'conservador',
      formality: 'smart-casual',
      prompt: 'Man with male model wearing light grey wool suit with two-button closure, light blue oxford dress shirt (no tie, top button undone), brown leather belt with silver buckle, chocolate brown leather derby shoes, minimalist silver watch, navy pocket square, business casual professional look, natural confident posture, office environment with glass windows, full body portrait, smart elegant style, contemporary business aesthetic, single person only, solo portrait',
      tags: ['business', 'conservativo', 'casual-profissional', 'trabalho']
    },
    {
      id: 'male_smart_casual_neutral',
      name: 'Smart Casual Clássico',
      category: 'Smart Casual Neutro',
      level: 'conservador',
      formality: 'smart-casual',
      prompt: 'Man with male model in beige cotton chinos with slight taper, navy blue unstructured blazer in cotton-linen blend, crisp white linen button-up shirt slightly untucked, brown suede penny loafers, no socks showing, leather belt matching shoes, classic preppy style, outdoor setting with natural light, relaxed confident stance, full body shot, timeless American casual elegance, clean and refined, single person only, solo portrait',
      tags: ['smart-casual', 'classico', 'preppy', 'versatil']
    },
    {
      id: 'male_casual_classic',
      name: 'Casual Clássico',
      category: 'Casual Clássico',
      level: 'conservador',
      formality: 'casual',
      prompt: 'Man with male model wearing dark indigo raw denim jeans with regular fit, medium grey merino wool crewneck sweater, white leather low-top sneakers (Stan Smith style), visible white t-shirt under sweater, simple silver watch, clean minimalist aesthetic, urban street background, natural daylight, full body casual pose, effortless everyday style, modern classic menswear, single person only, solo portrait',
      tags: ['casual', 'classico', 'jeans', 'minimalista']
    },
    {
      id: 'male_monochrome_elegant',
      name: 'Monochrome Sofisticado',
      category: 'Monochrome Elegante',
      level: 'conservador',
      formality: 'formal',
      prompt: 'Man with male model in all-black sophisticated outfit: black fine-knit turtleneck sweater, black wool tailored trousers with sharp crease, black leather Chelsea boots with subtle heel, black leather belt, silver ring, minimalist monochrome aesthetic, grey studio background, dramatic side lighting, full body portrait, sleek urban style, contemporary European elegance, refined and artistic, single person only, solo portrait',
      tags: ['monochrome', 'preto', 'sofisticado', 'minimalista']
    },

    // INTERMÉDIOS/VERSÁTEIS (5 looks)
    {
      id: 'male_smart_casual_modern',
      name: 'Smart Casual Moderno',
      category: 'Smart Casual Moderno',
      level: 'intermedio',
      formality: 'smart-casual',
      prompt: 'Man with male model wearing olive green cotton chinos with tapered fit, white premium cotton t-shirt with perfect fit, tan suede bomber jacket with ribbed collar and cuffs, white leather minimalist sneakers, brown leather watch with tan strap, contemporary smart casual style, urban outdoor setting, golden hour lighting, full body shot, modern menswear aesthetic, effortlessly cool and approachable, single person only, solo portrait',
      tags: ['smart-casual', 'moderno', 'bomber', 'urbano']
    },
    {
      id: 'male_business_casual_relaxed',
      name: 'Business Casual Relaxado',
      category: 'Business Casual Relaxado',
      level: 'intermedio',
      formality: 'smart-casual',
      prompt: 'Man with male model in charcoal grey wool trousers with flat front, medium blue chambray button-down shirt with rolled-up sleeves showing forearms, brown leather woven belt, sand-colored suede chukka boots, leather watch with brown strap, no jacket, relaxed professional style, bright office or café setting, natural lighting, full body casual stance, approachable business look, modern workwear, single person only, solo portrait',
      tags: ['business-casual', 'relaxado', 'camisa', 'versatil']
    },
    {
      id: 'male_layering_simple',
      name: 'Layering Simples',
      category: 'Layering Simples',
      level: 'intermedio',
      formality: 'casual',
      prompt: 'Man with male model wearing medium wash blue jeans with slight distressing, white cotton crew neck t-shirt, heather grey shawl-collar cardigan (open, with pockets), brown leather lace-up boots, denim and knitwear combination, cozy autumn aesthetic, outdoor park setting, soft natural light, full body relaxed pose, layered casual comfort, accessible everyday style, single person only, solo portrait',
      tags: ['layers', 'cardigan', 'outono', 'confortavel']
    },
    {
      id: 'male_weekend_casual',
      name: 'Weekend Casual',
      category: 'Weekend Casual',
      level: 'intermedio',
      formality: 'casual',
      prompt: 'Man with male model in khaki cotton cargo pants with utility pockets, black piqué polo shirt with collar, clean white leather sneakers, tortoiseshell aviator sunglasses, casual leather watch, relaxed weekend warrior style, outdoor daytime setting, bright natural light, full body confident pose, practical comfortable aesthetic, modern casual menswear, approachable and functional, single person only, solo portrait',
      tags: ['weekend', 'cargo', 'polo', 'desportivo']
    },
    {
      id: 'male_denim_smart',
      name: 'Denim Smart',
      category: 'Denim Smart',
      level: 'intermedio',
      formality: 'smart-casual',
      prompt: 'Man with male model wearing dark wash selvedge denim jeans, burgundy long-sleeve henley shirt with buttons undone, navy blue wool peacoat (double-breasted), brown leather brogue boots, brown leather belt, autumn casual sophistication, urban street or park setting, overcast natural light, full body walking pose, seasonal transitional style, elevated casual aesthetic, single person only, solo portrait',
      tags: ['denim', 'peacoat', 'sobretudo', 'transicao']
    },

    // EXPERIMENTAIS/OUSADOS (5 looks)
    {
      id: 'male_streetwear_urbano',
      name: 'Streetwear Urbano',
      category: 'Streetwear Urbano',
      level: 'experimental',
      formality: 'casual',
      prompt: 'Man with male model in black tapered joggers with drawstring and ankle zips, oversized heather grey graphic hoodie with bold street art print, chunky white leather dad sneakers with thick soles, black baseball cap worn forward, silver chain necklace, urban streetwear aesthetic, city street or skate park background, bright daylight, full body dynamic pose, contemporary street style, Gen Z fashion influence, single person only, solo portrait',
      tags: ['streetwear', 'urbano', 'hoodie', 'moderno']
    },
    {
      id: 'male_color_block_bold',
      name: 'Color Block Bold',
      category: 'Color Block Bold',
      level: 'experimental',
      formality: 'edgy',
      prompt: 'Man with male model wearing mustard yellow wide-wale corduroy pants with straight leg, forest green wool crewneck sweater with visible texture, white canvas sneakers, brown leather watch, bold autumn color palette, outdoor nature setting with fall foliage, warm natural lighting, full body confident stance, vibrant seasonal style, fashion-forward color blocking, artistic menswear, single person only, solo portrait',
      tags: ['color-block', 'cores-vibrantes', 'outono', 'ousado']
    },
    {
      id: 'male_layering_complexo',
      name: 'Layering Complexo',
      category: 'Layering Complexo',
      level: 'experimental',
      formality: 'edgy',
      prompt: 'Man with male model in black skinny jeans with slight stacking, white cotton t-shirt base layer, light wash denim shirt (open, worn as jacket layer), camel wool overcoat (knee-length, open), black leather combat boots with buckles, multiple layering technique, urban city street background, winter or autumn setting, natural overcast light, full body street style pose, editorial fashion aesthetic, textural complexity, single person only, solo portrait',
      tags: ['layers', 'complexo', 'editorial', 'inverno']
    },
    {
      id: 'male_pattern_mix',
      name: 'Pattern Mix',
      category: 'Pattern Mix',
      level: 'experimental',
      formality: 'edgy',
      prompt: 'Man with male model wearing grey and brown check plaid wool trousers (wide leg), solid burnt orange merino wool crewneck sweater, brown suede Chelsea boots, leather watch, pattern mixing menswear, library or vintage shop interior, warm ambient lighting, full body creative pose, fashion-forward styling, European influenced aesthetic, confident pattern play, single person only, solo portrait',
      tags: ['padroes', 'xadrez', 'criativo', 'europeu']
    },
    {
      id: 'male_avant_garde_casual',
      name: 'Avant-Garde Casual',
      category: 'Avant-Garde Casual',
      level: 'experimental',
      formality: 'edgy',
      prompt: 'Man with male model in black wide-leg wool trousers with high waist and dramatic drape, oversized cream chunky knit turtleneck sweater, minimalist black leather sandals with wide straps (worn with or without socks), avant-garde artistic style, modern gallery or minimalist architecture background, bright white lighting, full body editorial pose, contemporary artistic fashion, unconventional silhouette, designer menswear influence, single person only, solo portrait',
      tags: ['avant-garde', 'artistico', 'minimalista', 'designer']
    },

    // ESTILOS ESPECÍFICOS (5 looks)
    {
      id: 'male_athleisure',
      name: 'Athleisure',
      category: 'Athleisure',
      level: 'especifico',
      formality: 'casual',
      prompt: 'Man with male model wearing black technical fabric track pants with white side stripe, heather grey performance hoodie with half-zip, white and grey running sneakers with athletic sole, sporty digital watch, athleisure crossover style, gym or modern urban setting, bright natural lighting, full body active casual pose, functional sporty aesthetic, contemporary fitness fashion, comfortable performance wear, single person only, solo portrait',
      tags: ['athleisure', 'fitness', 'desportivo', 'confortavel']
    },
    {
      id: 'male_vintage_inspired',
      name: 'Vintage Inspired',
      category: 'Vintage Inspired',
      level: 'especifico',
      formality: 'edgy',
      prompt: 'Man with male model in high-waisted brown corduroy pants (wide leg, 70s cut), cream cable-knit sweater vest worn over mustard and brown geometric patterned collar shirt, brown leather loafers, round vintage-style glasses, retro 1970s aesthetic, vintage café or record shop setting, warm nostalgic lighting, full body relaxed vintage pose, throwback fashion, analog era inspired, single person only, solo portrait',
      tags: ['vintage', 'retro', 'anos70', 'nostalgico']
    },
    {
      id: 'male_workwear_rugged',
      name: 'Workwear/Rugged',
      category: 'Workwear/Rugged',
      level: 'especifico',
      formality: 'casual',
      prompt: 'Man with male model wearing raw selvedge denim jeans (straight leg with cuff), red and black buffalo check flannel shirt (heavy cotton), tan leather work boots with Goodyear welt and visible stitching, brown leather belt, rugged Americana workwear aesthetic, outdoor workshop or forest setting, natural daylight, full body working man pose, heritage menswear, durable practical style, blue-collar inspired, single person only, solo portrait',
      tags: ['workwear', 'rugged', 'flannel', 'americano']
    },
    {
      id: 'male_summer_minimal',
      name: 'Summer Minimal',
      category: 'Summer Minimal',
      level: 'especifico',
      formality: 'casual',
      prompt: 'Man with male model in beige linen shorts (above knee, relaxed fit), white linen long-sleeve shirt (half-buttoned showing chest, sleeves rolled), natural canvas espadrilles, woven bracelet, minimalist summer vacation style, Mediterranean coastal setting or beach background, bright sunny lighting, full body relaxed vacation pose, breezy warm weather aesthetic, resort casual elegance, single person only, solo portrait',
      tags: ['verao', 'linho', 'minimalista', 'ferias']
    },
    {
      id: 'male_night_out_statement',
      name: 'Night Out Statement',
      category: 'Night Out Statement',
      level: 'especifico',
      formality: 'edgy',
      prompt: 'Man with male model wearing black leather pants with slight sheen, burgundy silk or satin finish shirt (half-tucked, few buttons undone), black leather ankle boots with silver hardware details, silver rings and chain, edgy evening going-out style, nightclub or upscale bar interior with moody lighting, dramatic side lighting, full body confident nightlife pose, fashion-forward evening wear, rock-influenced elegance, single person only, solo portrait',
      tags: ['noite', 'couro', 'edgy', 'rock']
    }
  ];

  // ===== MULHER - 20 LOOKS =====

  private static readonly FEMALE_LOOKS: ComprehensiveLook[] = [
    // CONSERVADORES (5 looks)
    {
      id: 'female_corporate_formal',
      name: 'Terno Executivo Feminino',
      category: 'Corporate Formal',
      level: 'conservador',
      formality: 'formal',
      prompt: 'Professional female model in black wool tailored pantsuit with slim-fit blazer (single button), matching black straight-leg trousers with sharp crease, white silk charmeuse blouse with subtle sheen, pointed-toe black leather pumps (3-inch heel), minimal gold jewelry (small hoop earrings, delicate necklace), structured black leather tote bag, executive professional aesthetic, modern office setting with glass, natural bright lighting, full body confident power pose, polished corporate elegance, contemporary businesswoman style',
      tags: ['ternos', 'executivo', 'poder', 'profissional']
    },
    {
      id: 'female_business_elegant',
      name: 'Business Elegante',
      category: 'Business Elegant',
      level: 'conservador',
      formality: 'smart-casual',
      prompt: 'Female model wearing camel beige wool midi pencil skirt (hits below knee), ivory cashmere crewneck sweater (tucked in), nude patent leather pointed-toe heels, thin gold belt at waist, classic pearl stud earrings, nude structured handbag, sophisticated office style, bright windowed office or upscale café setting, soft natural lighting, full body elegant standing pose, timeless professional femininity, refined business aesthetic',
      tags: ['elegante', 'saia-meia', 'casimira', 'classico']
    },
    {
      id: 'female_smart_casual_classic',
      name: 'Smart Casual Clássico Feminino',
      category: 'Smart Casual Clássico',
      level: 'conservador',
      formality: 'smart-casual',
      prompt: 'Female model in navy blue high-waisted wide-leg wool trousers with front pleat, crisp white cotton button-up shirt (sleeves rolled to elbow), tan unstructured linen blazer, nude or tan pointed-toe flats, minimal gold watch, structured cognac leather bag, timeless professional casual style, modern office or urban street setting, bright daylight, full body walking pose, classic American style, effortless professional elegance',
      tags: ['smart-casual', 'classico', 'calça-larga', 'versatil']
    },
    {
      id: 'female_casual_minimalist',
      name: 'Casual Minimalista',
      category: 'Casual Minimalista',
      level: 'conservador',
      formality: 'casual',
      prompt: 'Female model wearing light wash straight-leg vintage denim jeans (high-waisted), heather grey fine-knit cashmere crewneck sweater, white leather low-top sneakers (clean minimalist design), delicate layered gold necklaces, small gold hoop earrings, simple leather crossbody bag, effortless everyday casual, outdoor urban setting or café, natural soft lighting, full body relaxed pose, Scandinavian minimal aesthetic, understated chic',
      tags: ['minimalista', 'casual', 'jeans', 'cashemire']
    },
    {
      id: 'female_monochrome_sophisticated',
      name: 'Monochrome Sofisticado',
      category: 'Monochrome Sofisticado',
      level: 'conservador',
      formality: 'formal',
      prompt: 'Female model in all-cream tonal outfit: cream cashmere turtleneck sweater, cream high-waisted tailored wool trousers with wide leg, cream wool longline coat (open), beige leather pointed-toe heels, beige structured leather handbag, gold minimal jewelry, sophisticated neutral palette, upscale city street or modern architecture background, soft natural winter light, full body elegant walking pose, European luxury aesthetic, tonal dressing mastery',
      tags: ['monochrome', 'creme', 'casaco-longo', 'elegante']
    },

    // INTERMÉDIOS/VERSÁTEIS (5 looks)
    {
      id: 'female_feminine_smart',
      name: 'Feminine Smart',
      category: 'Feminine Smart',
      level: 'intermedio',
      formality: 'smart-casual',
      prompt: 'Female model wearing midi-length A-line skirt in muted floral print (dusty rose, sage green, cream background), black fine-knit turtleneck sweater (tucked in), black leather ankle boots with low heel, structured tan leather shoulder bag, gold watch and rings, modern feminine professional style, urban café or boutique setting, warm natural lighting, full body graceful standing pose, contemporary romantic aesthetic, approachable elegance',
      tags: ['feminino', 'saia-floral', 'romantico', 'profissional']
    },
    {
      id: 'female_relaxed_chic',
      name: 'Relaxed Chic',
      category: 'Relaxed Chic',
      level: 'intermedio',
      formality: 'casual',
      prompt: 'Female model in high-waisted medium wash blue jeans (straight leg), navy and white horizontal striped long-sleeve Breton top, tan cotton trench coat (belted at waist, open), white leather sneakers, red leather crossbody bag, gold small hoop earrings, Parisian effortless casual style, cobblestone street or park setting, soft overcast lighting, full body walking with coat flowing pose, French girl aesthetic, timeless casual sophistication',
      tags: ['parisiano', 'trench-coat', 'breton', 'descontraido']
    },
    {
      id: 'female_layered_transitional',
      name: 'Layered Transitional',
      category: 'Layered Transitional',
      level: 'intermedio',
      formality: 'casual',
      prompt: 'Female model wearing black skinny high-waisted jeans, white cotton crew neck t-shirt, long heather grey ribbed cardigan (open, reaching mid-thigh) with pockets, black leather ankle boots with small heel, layered delicate necklaces, leather tote bag, cozy transitional layering, indoor-outdoor café or bookshop setting, autumn natural light, full body comfortable relaxed pose, accessible everyday style, effortless layering technique',
      tags: ['layers', 'cardigan', 'transicao', 'confortavel']
    },
    {
      id: 'female_weekend_comfort',
      name: 'Weekend Comfort',
      category: 'Weekend Comfort',
      level: 'intermedio',
      formality: 'casual',
      prompt: 'Female model in high-waisted beige linen wide-leg pants (relaxed fit), white ribbed cotton tank top, oversized light wash denim shirt (worn open as jacket, sleeves rolled), tan leather flat sandals, woven straw bag, gold bangles and sunglasses, effortless weekend ease, outdoor market or beach town setting, bright sunny lighting, full body casual strolling pose, California casual aesthetic, breezy comfort style',
      tags: ['weekend', 'linho', 'relaxado', 'praia']
    },
    {
      id: 'female_date_night_subtle',
      name: 'Date Night Subtle',
      category: 'Date Night Subtle',
      level: 'intermedio',
      formality: 'smart-casual',
      prompt: 'Female model wearing black silk midi slip dress with delicate spaghetti straps (bias cut, elegant drape), black leather moto jacket (fitted), black strappy heeled sandals, small black leather clutch, gold hoop earrings and layered necklaces, understated evening elegance, upscale restaurant or bar interior with ambient lighting, warm moody lighting, full body confident standing pose, modern date night sophistication, edgy feminine balance',
      tags: ['noite', 'vestido-seda', 'moto-jacket', 'romantico']
    },

    // EXPERIMENTAIS/OUSADOS (5 looks)
    {
      id: 'female_streetwear_feminino',
      name: 'Streetwear Feminino',
      category: 'Streetwear Feminino',
      level: 'experimental',
      formality: 'casual',
      prompt: 'Female model in olive green cotton cargo pants (high-waisted with utility pockets), cropped black puffer jacket (shiny finish), white and grey chunky platform sneakers, small black nylon crossbody bag, gold hoop earrings, athletic urban streetwear style, city street or urban park setting, bright daylight, full body dynamic walking pose, Gen Z street fashion, functional sporty aesthetic, contemporary urban uniform',
      tags: ['streetwear', 'cargo', 'puffer', 'urbano']
    },
    {
      id: 'female_color_maximalist',
      name: 'Color Maximalist',
      category: 'Color Maximalist',
      level: 'experimental',
      formality: 'edgy',
      prompt: 'Female model wearing hot pink high-waisted wide-leg wool trousers, cobalt blue silk charmeuse blouse (tucked in, with subtle drape), bright yellow leather pointed-toe heels, color-blocked statement handbag (multiple bright colors), gold bold jewelry, fearless color blocking style, modern gallery or colorful mural background, bright natural lighting, full body bold confident pose, maximalist fashion editorial, vibrant artistic expression',
      tags: ['color-block', 'maximalista', 'ousado', 'artistico']
    },
    {
      id: 'female_edgy_layered',
      name: 'Edgy Layered',
      category: 'Edgy Layered',
      level: 'experimental',
      formality: 'edgy',
      prompt: 'Female model in black leather high-waisted skinny pants with ankle zips, vintage band graphic t-shirt (slightly oversized), oversized grey wool boyfriend blazer (sleeves pushed up), black leather combat boots with silver hardware, layered silver chain necklaces and rings, small black leather bag, rock-inspired edge, urban alley or music venue setting, moody natural light, full body cool relaxed pose, alternative fashion aesthetic, rebellion meets sophistication',
      tags: ['edgy', 'rock', 'couro', 'alternativo']
    },
    {
      id: 'female_pattern_clash',
      name: 'Pattern Clash',
      category: 'Pattern Clash',
      level: 'experimental',
      formality: 'edgy',
      prompt: 'Female model wearing leopard print midi skirt (A-line, silk or satin finish), black and white horizontal striped fitted turtleneck, red leather ankle boots with pointed toe, brown leather structured bag, gold statement earrings, bold pattern mixing style, artistic neighborhood or vintage shop setting, warm natural lighting, full body fashion-forward pose, editorial pattern play, confident eclectic styling, fashion risk-taker aesthetic',
      tags: ['padroes', 'onca', 'ousado', 'editorial']
    },
    {
      id: 'female_avant_garde',
      name: 'Avant-Garde',
      category: 'Avant-Garde',
      level: 'experimental',
      formality: 'edgy',
      prompt: 'Female model in asymmetric black midi dress with architectural draping and one-shoulder detail, sculptural oversized black jacket with exaggerated shoulders or unusual cut, large geometric silver earrings, black minimalist leather heels with unique design, structured angular black bag, artistic fashion-forward style, modern art gallery or minimalist architecture background, dramatic lighting with shadows, full body editorial high-fashion pose, conceptual designer aesthetic, wearable art influence',
      tags: ['avant-garde', 'arquitetonico', 'designer', 'conceitual']
    },

    // ESTILOS ESPECÍFICOS (5 looks)
    {
      id: 'female_athleisure_chic',
      name: 'Athleisure Chic',
      category: 'Athleisure Chic',
      level: 'especifico',
      formality: 'casual',
      prompt: 'Female model wearing high-waisted black technical fabric leggings with mesh panels, oversized soft pink or lavender hoodie (cropped or regular length), chunky white and pink platform sneakers, rose gold smart watch, small black crossbody athletic bag, sporty casual fusion style, modern gym or urban wellness space, bright clean lighting, full body active casual pose, contemporary fitness fashion, comfortable performance aesthetic meets street style',
      tags: ['athleisure', 'fitness', 'leggings', 'moderno']
    },
    {
      id: 'female_vintage_romance',
      name: 'Vintage Romance',
      category: 'Vintage Romance',
      level: 'especifico',
      formality: 'edgy',
      prompt: 'Female model in flowy midi-length floral dress (earth tones: rust, mustard, sage green, cream) with small floral print, vintage-inspired silhouette with puff sleeves or smocked bodice, brown leather belt at waist, tan suede ankle boots, layered gold delicate necklaces, small leather crossbody bag, 1970s boho romantic style, outdoor field or vintage market setting, golden hour warm lighting, full body dreamy twirling pose, nostalgic feminine aesthetic, bohemian vintage revival',
      tags: ['vintage', 'boho', 'romantico', 'anos70']
    },
    {
      id: 'female_boho_modern',
      name: 'Boho Modern',
      category: 'Boho Modern',
      level: 'especifico',
      formality: 'edgy',
      prompt: 'Female model wearing high-waisted terracotta linen wide-leg pants (flowing fabric), off-white or cream crochet sleeveless top, layered mixed-metal necklaces (long and short), woven natural fiber circular bag, brown leather sandals, stacked rings and bangles, contemporary bohemian style, outdoor desert or beach setting with natural textures, warm sunset lighting, full body free-spirited pose, modern boho chic, earthy artistic aesthetic',
      tags: ['boho', 'moderno', 'croche', 'natural']
    },
    {
      id: 'female_summer_breezy',
      name: 'Summer Breezy',
      category: 'Summer Breezy',
      level: 'especifico',
      formality: 'casual',
      prompt: 'Female model in high-waisted white linen shorts (tailored with pleats), navy and white striped cotton tank top (tucked in), beige espadrille wedge sandals, wide-brim natural straw hat, woven straw tote bag, gold aviator sunglasses, effortless Mediterranean vacation style, coastal town or beach club setting, bright sunny midday light, full body relaxed vacation pose, European summer elegance, breezy warm-weather sophistication',
      tags: ['verao', 'mediterraneo', 'palha', 'ferias']
    },
    {
      id: 'female_night_out_glam',
      name: 'Night Out Glam',
      category: 'Night Out Glam',
      level: 'especifico',
      formality: 'edgy',
      prompt: 'Female model wearing emerald green silk satin midi slip dress with cowl neck or thin straps (body-skimming fit), strappy black or metallic heeled sandals (stiletto), statement drop earrings (gold or crystal), small structured clutch bag (metallic or satin), delicate layered bracelets, cocktail evening glamour, upscale bar or hotel lounge interior with dim ambient lighting, warm moody dramatic lighting, full body elegant standing pose, sophisticated evening elegance, special occasion statement style',
      tags: ['glamour', 'noite', 'vestido-seda', 'elegante']
    }
  ];

  // ===== MÉTODOS PÚBLICOS =====

  static getAllLooks(gender: 'male' | 'female'): ComprehensiveLook[] {
    if (gender === 'male') {
      return [...this.MALE_LOOKS];
    } else {
      return [...this.FEMALE_LOOKS];
    }
  }

  static getLooksByLevel(gender: 'male' | 'female', level: 'conservador' | 'intermedio' | 'experimental' | 'especifico'): ComprehensiveLook[] {
    const allLooks = this.getAllLooks(gender);
    return allLooks.filter(look => look.level === level);
  }

  static getLooksByCategory(gender: 'male' | 'female', category: string): ComprehensiveLook[] {
    const allLooks = this.getAllLooks(gender);
    return allLooks.filter(look => look.category === category);
  }

  static getLookById(id: string): ComprehensiveLook | null {
    const allLooks = [...this.MALE_LOOKS, ...this.FEMALE_LOOKS];
    return allLooks.find(look => look.id === id) || null;
  }

  static getRandomLooks(gender: 'male' | 'female', count: number = 15): ComprehensiveLook[] {
    const allLooks = this.getAllLooks(gender);
    const shuffled = [...allLooks].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, allLooks.length));
  }

  static getBalancedSelection(gender: 'male' | 'female'): ComprehensiveLook[] {
    const conservative = this.getLooksByLevel(gender, 'conservador');
    const intermediate = this.getLooksByLevel(gender, 'intermedio');
    const experimental = this.getLooksByLevel(gender, 'experimental');
    const specific = this.getLooksByLevel(gender, 'especifico');

    return [
      ...conservative.slice(0, 3),
      ...intermediate.slice(0, 4),
      ...experimental.slice(0, 3),
      ...specific.slice(0, 3)
    ].sort(() => Math.random() - 0.5);
  }

  static getTotalCount(gender: 'male' | 'female'): number {
    return this.getAllLooks(gender).length;
  }

  static getStats(): { male: number; female: number; total: number } {
    return {
      male: this.MALE_LOOKS.length,
      female: this.FEMALE_LOOKS.length,
      total: this.MALE_LOOKS.length + this.FEMALE_LOOKS.length
    };
  }
}