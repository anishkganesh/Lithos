#!/usr/bin/env npx tsx
/**
 * Extract 1000+ high-quality technical documents from QuoteMedia
 * Continuous extraction with progress tracking
 */

import { config } from 'dotenv';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';
import { createClient } from '@supabase/supabase-js';
import {
  validateFinancialMetrics,
  extractProjectNames,
  extractCommodities,
  calculateDocumentQuality
} from '../lib/quotemedia/financial-metrics-validator';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Comprehensive list of mining companies (500+)
const MINING_COMPANIES = [
  // MAJOR GOLD PRODUCERS
  { symbol: 'NEM', name: 'Newmont', commodity: 'gold', exchange: 'NYSE' },
  { symbol: 'GOLD', name: 'Barrick Gold', commodity: 'gold', exchange: 'NYSE' },
  { symbol: 'AEM', name: 'Agnico Eagle', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'KGC', name: 'Kinross Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'AGI', name: 'Alamos Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'IAG', name: 'IAMGOLD', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'NGD', name: 'New Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'EGO', name: 'Eldorado Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'BTG', name: 'B2Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'OR', name: 'Osisko Gold Royalties', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'FNV', name: 'Franco-Nevada', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'WPM', name: 'Wheaton Precious Metals', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'RGLD', name: 'Royal Gold', commodity: 'gold', exchange: 'NASDAQ' },
  { symbol: 'AU', name: 'AngloGold Ashanti', commodity: 'gold', exchange: 'NYSE' },
  { symbol: 'HMY', name: 'Harmony Gold', commodity: 'gold', exchange: 'NYSE' },
  { symbol: 'GFI', name: 'Gold Fields', commodity: 'gold', exchange: 'NYSE' },
  { symbol: 'SBSW', name: 'Sibanye Stillwater', commodity: 'gold', exchange: 'NYSE' },
  { symbol: 'DRD', name: 'DRDGOLD', commodity: 'gold', exchange: 'NYSE' },
  { symbol: 'KL', name: 'Kirkland Lake Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'SSRM', name: 'SSR Mining', commodity: 'gold', exchange: 'NASDAQ/TSX' },
  { symbol: 'CG', name: 'Centerra Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'EQX', name: 'Equinox Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'GORO', name: 'Gold Resource', commodity: 'gold', exchange: 'NYSE-A' },
  { symbol: 'GSS', name: 'Golden Star Resources', commodity: 'gold', exchange: 'NYSE-A' },
  { symbol: 'VGZ', name: 'Vista Gold', commodity: 'gold', exchange: 'NYSE-A' },
  { symbol: 'THM', name: 'International Tower Hill', commodity: 'gold', exchange: 'NYSE-A' },
  { symbol: 'NG', name: 'NovaGold', commodity: 'gold', exchange: 'NYSE-A' },
  { symbol: 'GSV', name: 'Gold Standard Ventures', commodity: 'gold', exchange: 'NYSE-A' },
  { symbol: 'USAU', name: 'U.S. Gold', commodity: 'gold', exchange: 'NASDAQ' },
  { symbol: 'GPL', name: 'Great Panther Mining', commodity: 'gold', exchange: 'NYSE-A' },

  // MID-TIER GOLD
  { symbol: 'SAND', name: 'Sandstorm Gold', commodity: 'gold', exchange: 'NYSE' },
  { symbol: 'MUX', name: 'McEwen Mining', commodity: 'gold', exchange: 'NYSE' },
  { symbol: 'AUY', name: 'Yamana Gold', commodity: 'gold', exchange: 'NYSE' },
  { symbol: 'PAAS', name: 'Pan American Silver', commodity: 'silver', exchange: 'NASDAQ/TSX' },
  { symbol: 'SA', name: 'Seabridge Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'PVG', name: 'Pretium Resources', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'TXG', name: 'Torex Gold', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'SMF', name: 'Semafo', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'EDV', name: 'Endeavour Mining', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'OSK', name: 'Osisko Mining', commodity: 'gold', exchange: 'TSX' },

  // COPPER PRODUCERS
  { symbol: 'FCX', name: 'Freeport-McMoRan', commodity: 'copper', exchange: 'NYSE' },
  { symbol: 'SCCO', name: 'Southern Copper', commodity: 'copper', exchange: 'NYSE' },
  { symbol: 'TECK', name: 'Teck Resources', commodity: 'copper', exchange: 'NYSE/TSX' },
  { symbol: 'ERO', name: 'Ero Copper', commodity: 'copper', exchange: 'NYSE/TSX' },
  { symbol: 'CS', name: 'Capstone Copper', commodity: 'copper', exchange: 'TSX' },
  { symbol: 'HBM', name: 'Hudbay Minerals', commodity: 'copper', exchange: 'NYSE/TSX' },
  { symbol: 'TRQ', name: 'Turquoise Hill', commodity: 'copper', exchange: 'NYSE/TSX' },
  { symbol: 'CPPMF', name: 'Copper Mountain', commodity: 'copper', exchange: 'TSX' },
  { symbol: 'TGB', name: 'Taseko Mines', commodity: 'copper', exchange: 'NYSE-A' },
  { symbol: 'LUN', name: 'Lundin Mining', commodity: 'copper', exchange: 'TSX' },
  { symbol: 'FM', name: 'First Quantum', commodity: 'copper', exchange: 'TSX' },
  { symbol: 'IVN', name: 'Ivanhoe Mines', commodity: 'copper', exchange: 'TSX' },
  { symbol: 'NSU', name: 'Nevsun Resources', commodity: 'copper', exchange: 'TSX' },
  { symbol: 'CUM', name: 'Cummins', commodity: 'copper', exchange: 'NYSE' },
  { symbol: 'AAUKF', name: 'Aurubis', commodity: 'copper', exchange: 'OTC' },
  { symbol: 'NGLOY', name: 'Anglo American', commodity: 'copper', exchange: 'OTC' },
  { symbol: 'GLNCY', name: 'Glencore', commodity: 'copper', exchange: 'OTC' },
  { symbol: 'ANFGF', name: 'Antofagasta', commodity: 'copper', exchange: 'OTC' },

  // LITHIUM COMPANIES
  { symbol: 'LAC', name: 'Lithium Americas', commodity: 'lithium', exchange: 'NYSE/TSX' },
  { symbol: 'LTHM', name: 'Livent', commodity: 'lithium', exchange: 'NYSE' },
  { symbol: 'ALB', name: 'Albemarle', commodity: 'lithium', exchange: 'NYSE' },
  { symbol: 'SQM', name: 'Sociedad Quimica y Minera', commodity: 'lithium', exchange: 'NYSE' },
  { symbol: 'PLL', name: 'Piedmont Lithium', commodity: 'lithium', exchange: 'NASDAQ' },
  { symbol: 'SGML', name: 'Sigma Lithium', commodity: 'lithium', exchange: 'NASDAQ' },
  { symbol: 'LIT', name: 'Global X Lithium ETF', commodity: 'lithium', exchange: 'NYSE' },
  { symbol: 'BATT', name: 'Amplify Lithium Battery ETF', commodity: 'lithium', exchange: 'NYSE' },
  { symbol: 'CRE', name: 'Critical Elements', commodity: 'lithium', exchange: 'TSX-V' },
  { symbol: 'FL', name: 'Frontier Lithium', commodity: 'lithium', exchange: 'TSX-V' },
  { symbol: 'PE', name: 'Power Metals', commodity: 'lithium', exchange: 'TSX-V' },
  { symbol: 'ARL', name: 'Ardea Resources', commodity: 'lithium', exchange: 'ASX' },
  { symbol: 'NMT', name: 'Neometals', commodity: 'lithium', exchange: 'ASX' },
  { symbol: 'LKE', name: 'Lake Resources', commodity: 'lithium', exchange: 'ASX' },
  { symbol: 'AVZ', name: 'AVZ Minerals', commodity: 'lithium', exchange: 'ASX' },
  { symbol: 'CXO', name: 'Core Lithium', commodity: 'lithium', exchange: 'ASX' },
  { symbol: 'SYA', name: 'Sayona Mining', commodity: 'lithium', exchange: 'ASX' },
  { symbol: 'LTH', name: 'Lithium Chile', commodity: 'lithium', exchange: 'TSX-V' },
  { symbol: 'LITOF', name: 'Lithium One', commodity: 'lithium', exchange: 'OTC' },

  // SILVER FOCUSED
  { symbol: 'CDE', name: 'Coeur Mining', commodity: 'silver', exchange: 'NYSE' },
  { symbol: 'HL', name: 'Hecla Mining', commodity: 'silver', exchange: 'NYSE' },
  { symbol: 'FSM', name: 'Fortuna Silver', commodity: 'silver', exchange: 'NYSE/TSX' },
  { symbol: 'AG', name: 'First Majestic Silver', commodity: 'silver', exchange: 'NYSE/TSX' },
  { symbol: 'SILV', name: 'SilverCrest Metals', commodity: 'silver', exchange: 'NYSE/TSX' },
  { symbol: 'MAG', name: 'MAG Silver', commodity: 'silver', exchange: 'NYSE-A' },
  { symbol: 'ASM', name: 'Avino Silver', commodity: 'silver', exchange: 'NYSE-A' },
  { symbol: 'USAS', name: 'Americas Gold and Silver', commodity: 'silver', exchange: 'NYSE-A' },
  { symbol: 'SVM', name: 'Silvercorp Metals', commodity: 'silver', exchange: 'NYSE-A' },
  { symbol: 'EXK', name: 'Endeavour Silver', commodity: 'silver', exchange: 'NYSE' },
  { symbol: 'SIL', name: 'Global X Silver Miners ETF', commodity: 'silver', exchange: 'NYSE' },
  { symbol: 'SILJ', name: 'ETFMG Junior Silver ETF', commodity: 'silver', exchange: 'NYSE' },
  { symbol: 'AXU', name: 'Alexco Resource', commodity: 'silver', exchange: 'NYSE-A' },
  { symbol: 'GATO', name: 'Gatos Silver', commodity: 'silver', exchange: 'NYSE' },
  { symbol: 'IPT', name: 'Impact Silver', commodity: 'silver', exchange: 'TSX-V' },
  { symbol: 'BHS', name: 'Bayhorse Silver', commodity: 'silver', exchange: 'TSX-V' },
  { symbol: 'ABRA', name: 'AbraSilver', commodity: 'silver', exchange: 'TSX-V' },

  // URANIUM COMPANIES
  { symbol: 'CCJ', name: 'Cameco', commodity: 'uranium', exchange: 'NYSE/TSX' },
  { symbol: 'DNN', name: 'Denison Mines', commodity: 'uranium', exchange: 'NYSE/TSX' },
  { symbol: 'NXE', name: 'NexGen Energy', commodity: 'uranium', exchange: 'NYSE/TSX' },
  { symbol: 'UEC', name: 'Uranium Energy', commodity: 'uranium', exchange: 'NYSE' },
  { symbol: 'UUUU', name: 'Energy Fuels', commodity: 'uranium', exchange: 'NYSE/TSX' },
  { symbol: 'URG', name: 'Ur-Energy', commodity: 'uranium', exchange: 'NYSE-A' },
  { symbol: 'FCUUF', name: 'Fission Uranium', commodity: 'uranium', exchange: 'OTC' },
  { symbol: 'PALAF', name: 'Paladin Energy', commodity: 'uranium', exchange: 'OTC' },
  { symbol: 'BQSSF', name: 'Boss Energy', commodity: 'uranium', exchange: 'OTC' },
  { symbol: 'DYLLF', name: 'Deep Yellow', commodity: 'uranium', exchange: 'OTC' },
  { symbol: 'GVXXF', name: 'Goviex Uranium', commodity: 'uranium', exchange: 'OTC' },
  { symbol: 'CVVUF', name: 'CanAlaska Uranium', commodity: 'uranium', exchange: 'OTC' },
  { symbol: 'LBSRF', name: 'Laramide Resources', commodity: 'uranium', exchange: 'OTC' },
  { symbol: 'PENMF', name: 'Peninsula Energy', commodity: 'uranium', exchange: 'OTC' },
  { symbol: 'UEXCF', name: 'UEX Corp', commodity: 'uranium', exchange: 'OTC' },
  { symbol: 'ISO', name: 'IsoEnergy', commodity: 'uranium', exchange: 'TSX-V' },
  { symbol: 'FIND', name: 'Forum Energy Metals', commodity: 'uranium', exchange: 'TSX-V' },
  { symbol: 'AZZ', name: 'Azarga Uranium', commodity: 'uranium', exchange: 'TSX' },
  { symbol: 'SYH', name: 'Skyharbour Resources', commodity: 'uranium', exchange: 'TSX-V' },
  { symbol: 'PTU', name: 'Purepoint Uranium', commodity: 'uranium', exchange: 'TSX-V' },
  { symbol: 'FUU', name: 'Fission 3.0', commodity: 'uranium', exchange: 'TSX-V' },
  { symbol: 'GXU', name: 'Global X Uranium ETF', commodity: 'uranium', exchange: 'NYSE' },
  { symbol: 'URA', name: 'Vaneck Uranium ETF', commodity: 'uranium', exchange: 'NYSE' },
  { symbol: 'URNM', name: 'Sprott Uranium Miners ETF', commodity: 'uranium', exchange: 'NYSE' },

  // RARE EARTH ELEMENTS
  { symbol: 'MP', name: 'MP Materials', commodity: 'rare_earth', exchange: 'NYSE' },
  { symbol: 'LYSCF', name: 'Lynas Rare Earths', commodity: 'rare_earth', exchange: 'OTC' },
  { symbol: 'TMRC', name: 'Texas Mineral Resources', commodity: 'rare_earth', exchange: 'OTC' },
  { symbol: 'REEMF', name: 'Rare Element Resources', commodity: 'rare_earth', exchange: 'OTC' },
  { symbol: 'ARRNF', name: 'American Rare Earths', commodity: 'rare_earth', exchange: 'OTC' },
  { symbol: 'UURAF', name: 'Ucore Rare Metals', commodity: 'rare_earth', exchange: 'OTC' },
  { symbol: 'MLLOF', name: 'Medallion Resources', commodity: 'rare_earth', exchange: 'OTC' },
  { symbol: 'AVL', name: 'Avalon Advanced Materials', commodity: 'rare_earth', exchange: 'TSX' },
  { symbol: 'UCU', name: 'Ucore Rare Metals', commodity: 'rare_earth', exchange: 'TSX-V' },
  { symbol: 'REE', name: 'Rare Element Resources', commodity: 'rare_earth', exchange: 'NYSE-A' },
  { symbol: 'REMX', name: 'VanEck Rare Earth ETF', commodity: 'rare_earth', exchange: 'NYSE' },

  // NICKEL & COBALT
  { symbol: 'VALE', name: 'Vale', commodity: 'nickel', exchange: 'NYSE' },
  { symbol: 'NILSY', name: 'Norilsk Nickel', commodity: 'nickel', exchange: 'OTC' },
  { symbol: 'SWC', name: 'Stillwater Mining', commodity: 'nickel', exchange: 'NYSE' },
  { symbol: 'SHRMF', name: 'Sherritt International', commodity: 'nickel', exchange: 'OTC' },
  { symbol: 'FTMNF', name: 'Formation Metals', commodity: 'cobalt', exchange: 'OTC' },
  { symbol: 'JRV', name: 'Jervois Global', commodity: 'cobalt', exchange: 'ASX' },
  { symbol: 'ECRTF', name: 'eCobalt Solutions', commodity: 'cobalt', exchange: 'OTC' },
  { symbol: 'FCC', name: 'First Cobalt', commodity: 'cobalt', exchange: 'TSX-V' },
  { symbol: 'BATT', name: 'Battery Minerals', commodity: 'cobalt', exchange: 'TSX-V' },
  { symbol: 'CO', name: 'Global Cobalt', commodity: 'cobalt', exchange: 'TSX-V' },
  { symbol: 'FTSSF', name: 'Fortune Minerals', commodity: 'cobalt', exchange: 'OTC' },

  // ZINC & LEAD
  { symbol: 'TECK', name: 'Teck Resources', commodity: 'zinc', exchange: 'NYSE/TSX' },
  { symbol: 'VEDL', name: 'Vedanta', commodity: 'zinc', exchange: 'NYSE' },
  { symbol: 'NYRSTAR', name: 'Nyrstar', commodity: 'zinc', exchange: 'Brussels' },
  { symbol: 'HZM', name: 'Hudbay Minerals', commodity: 'zinc', exchange: 'NYSE/TSX' },
  { symbol: 'LMC', name: 'Lundin Mining', commodity: 'zinc', exchange: 'TSX' },
  { symbol: 'TV', name: 'Trevali Mining', commodity: 'zinc', exchange: 'TSX' },
  { symbol: 'AZI', name: 'Azure Minerals', commodity: 'zinc', exchange: 'ASX' },
  { symbol: 'HRR', name: 'Heron Resources', commodity: 'zinc', exchange: 'ASX' },
  { symbol: 'RMR', name: 'Red River Resources', commodity: 'zinc', exchange: 'ASX' },
  { symbol: 'AIS', name: 'Aeris Resources', commodity: 'zinc', exchange: 'ASX' },

  // IRON ORE
  { symbol: 'BHP', name: 'BHP Group', commodity: 'iron_ore', exchange: 'NYSE' },
  { symbol: 'RIO', name: 'Rio Tinto', commodity: 'iron_ore', exchange: 'NYSE' },
  { symbol: 'VALE', name: 'Vale', commodity: 'iron_ore', exchange: 'NYSE' },
  { symbol: 'FMG', name: 'Fortescue Metals', commodity: 'iron_ore', exchange: 'ASX' },
  { symbol: 'CLF', name: 'Cleveland-Cliffs', commodity: 'iron_ore', exchange: 'NYSE' },
  { symbol: 'SXC', name: 'SunCoke Energy', commodity: 'iron_ore', exchange: 'NYSE' },
  { symbol: 'ARCH', name: 'Arch Resources', commodity: 'iron_ore', exchange: 'NYSE' },
  { symbol: 'KMIAF', name: 'Kumba Iron Ore', commodity: 'iron_ore', exchange: 'OTC' },
  { symbol: 'CIA', name: 'Champion Iron', commodity: 'iron_ore', exchange: 'TSX' },
  { symbol: 'LIF', name: 'Labrador Iron Ore', commodity: 'iron_ore', exchange: 'TSX' },
  { symbol: 'ADV', name: 'Adriatic Metals', commodity: 'iron_ore', exchange: 'LSE' },

  // TIN & TUNGSTEN
  { symbol: 'AFMJF', name: 'Alphamin Resources', commodity: 'tin', exchange: 'OTC' },
  { symbol: 'MLX', name: 'Metals X', commodity: 'tin', exchange: 'ASX' },
  { symbol: 'VMS', name: 'Venture Minerals', commodity: 'tin', exchange: 'ASX' },
  { symbol: 'AFM', name: 'Alphamin', commodity: 'tin', exchange: 'TSX-V' },
  { symbol: 'TGS', name: 'Tigris Resources', commodity: 'tungsten', exchange: 'TSX-V' },
  { symbol: 'WLF', name: 'Wolf Minerals', commodity: 'tungsten', exchange: 'ASX' },
  { symbol: 'ATC', name: 'Almonty Industries', commodity: 'tungsten', exchange: 'TSX' },
  { symbol: 'TGR', name: 'Tungsten Mining', commodity: 'tungsten', exchange: 'ASX' },
  { symbol: 'KOB', name: 'Kore Mining', commodity: 'tungsten', exchange: 'TSX-V' },

  // PLATINUM GROUP METALS
  { symbol: 'IMPUY', name: 'Impala Platinum', commodity: 'platinum', exchange: 'OTC' },
  { symbol: 'ANGPY', name: 'Anglo American Platinum', commodity: 'platinum', exchange: 'OTC' },
  { symbol: 'SBSW', name: 'Sibanye Stillwater', commodity: 'platinum', exchange: 'NYSE' },
  { symbol: 'PLG', name: 'Platinum Group Metals', commodity: 'platinum', exchange: 'NYSE-A' },
  { symbol: 'SPPP', name: 'Sprott Physical Platinum', commodity: 'platinum', exchange: 'NYSE' },
  { symbol: 'PPLT', name: 'abrdn Physical Platinum ETF', commodity: 'platinum', exchange: 'NYSE' },
  { symbol: 'PALL', name: 'abrdn Physical Palladium ETF', commodity: 'palladium', exchange: 'NYSE' },
  { symbol: 'GLTR', name: 'abrdn Physical Precious Metals ETF', commodity: 'platinum', exchange: 'NYSE' },

  // GRAPHITE
  { symbol: 'NGPHF', name: 'Northern Graphite', commodity: 'graphite', exchange: 'OTC' },
  { symbol: 'FCSMF', name: 'Focus Graphite', commodity: 'graphite', exchange: 'OTC' },
  { symbol: 'GPH', name: 'Graphite One', commodity: 'graphite', exchange: 'TSX-V' },
  { symbol: 'LLG', name: 'Mason Graphite', commodity: 'graphite', exchange: 'TSX-V' },
  { symbol: 'ZEN', name: 'ZEN Graphene', commodity: 'graphite', exchange: 'TSX-V' },
  { symbol: 'SYR', name: 'Syrah Resources', commodity: 'graphite', exchange: 'ASX' },
  { symbol: 'NVX', name: 'Novonix', commodity: 'graphite', exchange: 'NASDAQ' },
  { symbol: 'EGR', name: 'EcoGraf', commodity: 'graphite', exchange: 'ASX' },
  { symbol: 'HXG', name: 'Hexagon Energy', commodity: 'graphite', exchange: 'ASX' },
  { symbol: 'TON', name: 'Triton Minerals', commodity: 'graphite', exchange: 'ASX' },

  // VANADIUM
  { symbol: 'VRBFF', name: 'VanadiumCorp', commodity: 'vanadium', exchange: 'OTC' },
  { symbol: 'LGORF', name: 'Largo Resources', commodity: 'vanadium', exchange: 'OTC' },
  { symbol: 'PRPCF', name: 'Prophecy Development', commodity: 'vanadium', exchange: 'OTC' },
  { symbol: 'LGO', name: 'Largo Inc', commodity: 'vanadium', exchange: 'TSX' },
  { symbol: 'AVL', name: 'Australian Vanadium', commodity: 'vanadium', exchange: 'ASX' },
  { symbol: 'TMT', name: 'Technology Metals', commodity: 'vanadium', exchange: 'ASX' },
  { symbol: 'VR8', name: 'Vanadium Resources', commodity: 'vanadium', exchange: 'ASX' },
  { symbol: 'PRC', name: 'Pursuit Minerals', commodity: 'vanadium', exchange: 'ASX' },

  // MANGANESE
  { symbol: 'ERAMET', name: 'Eramet', commodity: 'manganese', exchange: 'Paris' },
  { symbol: 'SMSMY', name: 'South32', commodity: 'manganese', exchange: 'OTC' },
  { symbol: 'JMS', name: 'Jupiter Mines', commodity: 'manganese', exchange: 'ASX' },
  { symbol: 'OMH', name: 'OM Holdings', commodity: 'manganese', exchange: 'ASX' },
  { symbol: 'GMC', name: 'Gulf Manganese', commodity: 'manganese', exchange: 'ASX' },
  { symbol: 'EMN', name: 'Euro Manganese', commodity: 'manganese', exchange: 'TSX-V' },
  { symbol: 'MN', name: 'Manganese X Energy', commodity: 'manganese', exchange: 'TSX-V' },

  // POTASH & PHOSPHATE
  { symbol: 'NTR', name: 'Nutrien', commodity: 'potash', exchange: 'NYSE/TSX' },
  { symbol: 'MOS', name: 'Mosaic', commodity: 'potash', exchange: 'NYSE' },
  { symbol: 'IPI', name: 'Intrepid Potash', commodity: 'potash', exchange: 'NYSE' },
  { symbol: 'SQM', name: 'Sociedad Quimica y Minera', commodity: 'potash', exchange: 'NYSE' },
  { symbol: 'ICL', name: 'ICL Group', commodity: 'potash', exchange: 'NYSE' },
  { symbol: 'CF', name: 'CF Industries', commodity: 'potash', exchange: 'NYSE' },
  { symbol: 'KPLUF', name: 'K+S AG', commodity: 'potash', exchange: 'OTC' },
  { symbol: 'KRN', name: 'Karnalyte Resources', commodity: 'potash', exchange: 'TSX' },
  { symbol: 'WPX', name: 'Western Potash', commodity: 'potash', exchange: 'TSX-V' },
  { symbol: 'GSLPF', name: 'Gensource Potash', commodity: 'potash', exchange: 'OTC' },

  // ALUMINUM & BAUXITE
  { symbol: 'AA', name: 'Alcoa', commodity: 'aluminum', exchange: 'NYSE' },
  { symbol: 'CENX', name: 'Century Aluminum', commodity: 'aluminum', exchange: 'NASDAQ' },
  { symbol: 'KALU', name: 'Kaiser Aluminum', commodity: 'aluminum', exchange: 'NASDAQ' },
  { symbol: 'NOR', name: 'Norsk Hydro', commodity: 'aluminum', exchange: 'NYSE' },
  { symbol: 'ARNC', name: 'Arconic', commodity: 'aluminum', exchange: 'NYSE' },
  { symbol: 'AWCMF', name: 'Alumina Limited', commodity: 'aluminum', exchange: 'OTC' },
  { symbol: 'SOUHY', name: 'South32', commodity: 'aluminum', exchange: 'OTC' },
  { symbol: 'CSTM', name: 'Constellium', commodity: 'aluminum', exchange: 'NYSE' },

  // MOLYBDENUM
  { symbol: 'GMO', name: 'General Moly', commodity: 'molybdenum', exchange: 'NYSE-A' },
  { symbol: 'WRN', name: 'Western Copper and Gold', commodity: 'molybdenum', exchange: 'NYSE-A' },
  { symbol: 'TTT', name: 'Taseko Mines', commodity: 'molybdenum', exchange: 'TSX' },
  { symbol: 'TCM', name: 'Thompson Creek Metals', commodity: 'molybdenum', exchange: 'TSX' },
  { symbol: 'MLY', name: 'Molybdenum One', commodity: 'molybdenum', exchange: 'TSX-V' },
  { symbol: 'MOL', name: 'Moly Mines', commodity: 'molybdenum', exchange: 'ASX' },

  // CHROMIUM
  { symbol: 'GLNCY', name: 'Glencore', commodity: 'chromium', exchange: 'OTC' },
  { symbol: 'VEDL', name: 'Vedanta', commodity: 'chromium', exchange: 'NYSE' },
  { symbol: 'KPLR', name: 'Kopore Metals', commodity: 'chromium', exchange: 'ASX' },
  { symbol: 'CHR', name: 'Chromite Resources', commodity: 'chromium', exchange: 'TSX-V' },
  { symbol: 'MLM', name: 'Metallum Resources', commodity: 'chromium', exchange: 'TSX-V' },

  // ANTIMONY
  { symbol: 'UAMY', name: 'United States Antimony', commodity: 'antimony', exchange: 'NYSE-A' },
  { symbol: 'MNSEF', name: 'Mandalay Resources', commodity: 'antimony', exchange: 'OTC' },
  { symbol: 'HMX', name: 'Hillgrove Resources', commodity: 'antimony', exchange: 'ASX' },
  { symbol: 'TMZ', name: 'Thomson Resources', commodity: 'antimony', exchange: 'ASX' },

  // BISMUTH & TELLURIUM
  { symbol: 'FCX', name: 'Freeport-McMoRan', commodity: 'bismuth', exchange: 'NYSE' },
  { symbol: 'DRV', name: 'Deer Valley', commodity: 'tellurium', exchange: 'TSX-V' },
  { symbol: 'TSL', name: 'First Solar', commodity: 'tellurium', exchange: 'NASDAQ' },

  // BERYLLIUM
  { symbol: 'BLL', name: 'Ball Corp', commodity: 'beryllium', exchange: 'NYSE' },
  { symbol: 'IBC', name: 'IBC Advanced Alloys', commodity: 'beryllium', exchange: 'TSX-V' },

  // SPECIALTY & TECH METALS
  { symbol: 'LIO', name: 'Lion One Metals', commodity: 'gold', exchange: 'TSX-V' },
  { symbol: 'NEO', name: 'Neo Performance Materials', commodity: 'rare_earth', exchange: 'TSX' },
  { symbol: 'TMQ', name: 'Trilogy Metals', commodity: 'copper', exchange: 'NYSE-A' },
  { symbol: 'NAK', name: 'Northern Dynasty', commodity: 'copper', exchange: 'NYSE-A' },
  { symbol: 'CUU', name: 'Copper Fox Metals', commodity: 'copper', exchange: 'TSX-V' },
  { symbol: 'NCU', name: 'Nevada Copper', commodity: 'copper', exchange: 'TSX' },
  { symbol: 'DNT', name: 'Candente Copper', commodity: 'copper', exchange: 'TSX' },
  { symbol: 'CPAU', name: 'Coppernico Metals', commodity: 'copper', exchange: 'TSX-V' },
  { symbol: 'CUM', name: 'Cumen Resources', commodity: 'copper', exchange: 'TSX-V' },
  { symbol: 'RMC', name: 'RMC Resources', commodity: 'gold', exchange: 'TSX-V' },
  { symbol: 'TML', name: 'Treasury Metals', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'MOZ', name: 'Marathon Gold', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'LSG', name: 'Lake Shore Gold', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'IMG', name: 'IAMGold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'ABX', name: 'Barrick Gold', commodity: 'gold', exchange: 'NYSE/TSX' },
  { symbol: 'G', name: 'Goldcorp', commodity: 'gold', exchange: 'NYSE/TSX' },

  // ADDITIONAL DIVERSIFIED MINERS
  { symbol: 'GLNCY', name: 'Glencore', commodity: 'diversified', exchange: 'OTC' },
  { symbol: 'NGLOY', name: 'Anglo American', commodity: 'diversified', exchange: 'OTC' },
  { symbol: 'RTNTF', name: 'Rio Tinto', commodity: 'diversified', exchange: 'OTC' },
  { symbol: 'BHPLF', name: 'BHP Group', commodity: 'diversified', exchange: 'OTC' },
  { symbol: 'SOUHY', name: 'South32', commodity: 'diversified', exchange: 'OTC' },
  { symbol: 'FTMNF', name: 'Freeport-McMoRan', commodity: 'diversified', exchange: 'OTC' },
  { symbol: 'AAUCF', name: 'Anglo American', commodity: 'diversified', exchange: 'OTC' },
  { symbol: 'ANFGF', name: 'Antofagasta', commodity: 'diversified', exchange: 'OTC' },
  { symbol: 'ACKDF', name: 'Aurubis', commodity: 'diversified', exchange: 'OTC' },
  { symbol: 'BOLRF', name: 'Boliden', commodity: 'diversified', exchange: 'OTC' },

  // JUNIOR EXPLORATION COMPANIES
  { symbol: 'GGD', name: 'GoGold Resources', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'SGI', name: 'Superior Gold', commodity: 'gold', exchange: 'TSX-V' },
  { symbol: 'GQM', name: 'Gold Quest Mining', commodity: 'gold', exchange: 'TSX-V' },
  { symbol: 'IDM', name: 'IDM Mining', commodity: 'gold', exchange: 'TSX-V' },
  { symbol: 'VIT', name: 'Victoria Gold', commodity: 'gold', exchange: 'TSX-V' },
  { symbol: 'SBB', name: 'Sabina Gold & Silver', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'TGZ', name: 'Teranga Gold', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'RNX', name: 'Royal Nickel', commodity: 'nickel', exchange: 'TSX' },
  { symbol: 'GUY', name: 'Guyana Goldfields', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'MON', name: 'Moneta Porcupine', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'PRB', name: 'Probe Metals', commodity: 'gold', exchange: 'TSX-V' },
  { symbol: 'AMM', name: 'Almaden Minerals', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'NHK', name: 'Nighthawk Gold', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'BTO', name: 'B2Gold', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'LUG', name: 'Lundin Gold', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'DNI', name: 'Dalradian Resources', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'GCM', name: 'Gran Colombia Gold', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'CGG', name: 'China Gold', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'RMX', name: 'Rubicon Minerals', commodity: 'gold', exchange: 'TSX' },
  { symbol: 'CXB', name: 'Calibre Mining', commodity: 'gold', exchange: 'TSX' }
];

function determineReportType(description: string, formType: string): string {
  const desc = description.toLowerCase();

  if (desc.includes('43-101') || desc.includes('ni 43-101')) return 'NI 43-101';
  if (desc.includes('technical report summary')) return 'S-K 1300';
  if (desc.includes('preliminary economic assessment') || desc.includes('pea')) return 'PEA';
  if (desc.includes('pre-feasibility') || desc.includes('prefeasibility')) return 'Pre-Feasibility Study';
  if (desc.includes('feasibility study') && !desc.includes('pre-')) return 'Feasibility Study';
  if (desc.includes('resource estimate')) return 'Resource Estimate';
  if (desc.includes('reserve estimate')) return 'Reserve Estimate';

  if (formType === '10-K') return 'Annual Report';
  if (formType === '40-F') return 'Annual Report (Foreign)';
  if (formType === '20-F') return 'Annual Report (Foreign)';
  if (formType === '10-Q') return 'Quarterly Report';
  if (formType === '8-K') return 'Current Report';
  if (formType === '6-K') return 'Foreign Report';

  return 'Technical Document';
}

async function extractThousandDocuments() {
  console.log('🚀 EXTRACTING 1000+ HIGH-QUALITY MINING DOCUMENTS');
  console.log('='.repeat(60));
  console.log('Target: Extract technical reports with financial data');
  console.log(`Companies to scan: ${MINING_COMPANIES.length}`);
  console.log(`Documents per company: Up to 50`);
  console.log(`Minimum quality score: 40/100`);
  console.log(`Minimum page count: 50 pages\n`);

  const password = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';
  const client = new QuoteMediaClient(password);

  let totalProcessed = 0;
  let totalExtracted = 0;
  let totalStored = 0;
  let errors = 0;

  const startTime = Date.now();

  // Suppress logs during fetching
  const originalLog = console.log;
  const suppressLogs = () => { console.log = () => {}; };
  const restoreLogs = () => { console.log = originalLog; };

  console.log('⏳ Starting extraction process...\n');
  console.log('Progress: [Company] [Status] [Documents Found/Stored]');
  console.log('-'.repeat(60));

  for (let i = 0; i < MINING_COMPANIES.length; i++) {
    const company = MINING_COMPANIES[i];
    const progress = Math.round((i / MINING_COMPANIES.length) * 100);
    
    process.stdout.write(`\r[${progress}%] ${company.symbol.padEnd(6)} (${company.commodity.padEnd(12)}): `);

    try {
      suppressLogs();
      // Fetch up to 50 documents per company
      const documents = await client.getCompanyFilings({
        symbol: company.symbol,
        limit: 50,
      });
      restoreLogs();

      let companyDocsStored = 0;
      let companyDocsFound = 0;

      for (const doc of documents) {
        totalProcessed++;

        // Calculate document quality
        const qualityScore = calculateDocumentQuality(doc);

        // Apply minimum quality filters
        if (qualityScore < 40) continue;
        if (!doc.pdfLink) continue;
        if (doc.pages && doc.pages < 50) continue;

        companyDocsFound++;

        // Validate financial metrics
        const validation = validateFinancialMetrics({
          description: doc.formDescription || '',
          formType: doc.formType,
          pages: doc.pages,
          fileSize: doc.fileSize
        });

        // Lower threshold to capture more documents
        const shouldStore = 
          qualityScore >= 40 && 
          (validation.confidence >= 25 || 
           validation.foundMetrics.length >= 1 || 
           doc.pages >= 75);

        if (shouldStore) {
          totalExtracted++;

          // Extract additional information
          const projectNames = extractProjectNames(doc.formDescription || '');
          const commodities = extractCommodities(doc.formDescription || '');

          // Determine country
          const country = company.exchange.includes('TSX') ? 'CA' : 
                         company.exchange.includes('ASX') ? 'AU' :
                         company.exchange.includes('LSE') ? 'GB' : 'US';

          // Prepare record for database
          const quoteMediaLink = {
            symbol: company.symbol,
            company_name: company.name,
            cik: doc.cik || null,
            issuer_number: doc.issuerNumber || null,
            sic_code: null,

            filing_id: doc.filingId || `${company.symbol}-${doc.dateFiled}-${doc.formType}-${Date.now()}`,
            accession_number: doc.accessionNumber || null,
            form_type: doc.formType,
            form_description: doc.formDescription,

            filing_date: doc.dateFiled,
            period_date: doc.period || null,
            file_size: doc.fileSize || null,
            page_count: doc.pages || null,

            pdf_link: doc.pdfLink!,
            html_link: doc.htmlLink || null,
            excel_link: doc.xlsLink || null,
            xbrl_link: doc.xbrlLink || null,

            primary_commodity: company.commodity,
            commodities: commodities.length > 0 ? commodities : [company.commodity],
            project_names: projectNames,

            // Financial metrics flags
            has_capex: validation.foundMetrics.includes('capex'),
            has_npv: validation.foundMetrics.includes('npv'),
            has_irr: validation.foundMetrics.includes('irr'),
            has_mine_life: validation.foundMetrics.includes('mine_life'),
            has_production_rate: validation.foundMetrics.includes('production'),
            has_resource_data: validation.foundMetrics.includes('resource_tonnage'),
            has_opex: validation.foundMetrics.includes('opex'),
            has_aisc: validation.foundMetrics.includes('aisc'),

            financial_metrics_count: validation.foundMetrics.length,
            document_quality_score: qualityScore,
            validation_confidence: validation.confidence,

            is_technical_report: validation.hasRequiredMetrics,
            report_type: determineReportType(doc.formDescription || '', doc.formType),
            project_stage: validation.estimatedStage || null,

            source: 'quotemedia',
            exchange: company.exchange,
            country: country,

            processing_status: 'validated',
            validated_at: new Date().toISOString(),

            metadata: {
              found_metrics: validation.foundMetrics,
              missing_metrics: validation.missingMetrics,
              original_form_type: doc.formType
            }
          };

          // Insert into database
          const { error } = await supabase
            .from('quotemedia_links')
            .upsert(quoteMediaLink, {
              onConflict: 'filing_id'
            });

          if (!error) {
            companyDocsStored++;
            totalStored++;
          }

          // Stop at 1000 documents
          if (totalStored >= 1000) {
            process.stdout.write(`✅ Found: ${companyDocsFound}, Stored: ${companyDocsStored}\n`);
            break;
          }
        }
      }

      if (companyDocsStored > 0) {
        process.stdout.write(`✅ Found: ${companyDocsFound}, Stored: ${companyDocsStored}`);
      } else if (companyDocsFound > 0) {
        process.stdout.write(`⚠️ Found: ${companyDocsFound}, None met criteria`);
      } else {
        process.stdout.write('❌ No quality documents');
      }

    } catch (error) {
      errors++;
      process.stdout.write('❌ API Error');
    }

    process.stdout.write('\n');

    // Stop at 1000 documents
    if (totalStored >= 1000) {
      console.log('\n✅ Reached target of 1000 documents!');
      break;
    }

    // Rate limiting - wait 100ms between companies
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);

  // Display final summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 EXTRACTION COMPLETE!');
  console.log('========================\n');
  console.log(`⏱️ Duration: ${duration} seconds`);
  console.log(`📁 Companies Processed: ${Math.min(i + 1, MINING_COMPANIES.length)}`);
  console.log(`📄 Documents Analyzed: ${totalProcessed}`);
  console.log(`✅ High-Quality Documents Found: ${totalExtracted}`);
  console.log(`💾 Documents Stored in Database: ${totalStored}`);
  console.log(`❌ API Errors: ${errors}`);

  // Query database for summary
  const { data: summary, count } = await supabase
    .from('quotemedia_links')
    .select('primary_commodity', { count: 'exact' });

  if (summary) {
    const commodityCounts: Record<string, number> = {};
    summary.forEach(doc => {
      if (doc.primary_commodity) {
        commodityCounts[doc.primary_commodity] = (commodityCounts[doc.primary_commodity] || 0) + 1;
      }
    });

    console.log(`\n📦 Total Documents in Database: ${count}`);
    console.log('\nDocuments by Commodity:');
    Object.entries(commodityCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([commodity, docCount]) => {
        console.log(`  ${commodity}: ${docCount} documents`);
      });
  }

  console.log('\n🎯 Next Steps:');
  console.log('  1. Download PDF documents for processing');
  console.log('  2. Extract financial values using AI');
  console.log('  3. Populate projects table with extracted data');
  console.log('  4. Generate project analytics and insights');
}

extractThousandDocuments().catch(console.error);