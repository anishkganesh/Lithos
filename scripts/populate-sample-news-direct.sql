-- Direct SQL to populate sample mining news
-- Run this in Supabase SQL editor

INSERT INTO quotemedia_news (
  news_id, symbol, company_name, headline, summary, source,
  datetime, story_url, topics, primary_commodity, commodities, news_category,
  is_mining_related, is_project_related, mentions_financials,
  mentions_technical_report, sentiment_score, relevance_score, processing_status
) VALUES
-- Lithium News
(3001, 'LAC', 'Lithium Americas Corp', 'Lithium Americas Receives Final Federal Permit for Thacker Pass Project',
 'The U.S. Bureau of Land Management issued the Record of Decision for Thacker Pass, clearing the way for construction of the largest known lithium resource in the United States.',
 'Reuters', '2025-01-26T14:30:00Z', 'https://example.com/news/lac-permit',
 ARRAY['LAC','lithium','Nevada','permits'], 'lithium', ARRAY['lithium'], 'regulatory',
 true, true, false, false, 0.9, 10, 'processed'),

(3002, 'ALB', 'Albemarle Corporation', 'Albemarle Reports 45% Increase in Lithium Hydroxide Production',
 'Q4 results show record production at Kemerton facility in Australia, with battery-grade lithium hydroxide output reaching 15,000 tonnes.',
 'Mining Weekly', '2025-01-26T09:15:00Z', 'https://example.com/news/alb-production',
 ARRAY['ALB','lithium','Australia','production'], 'lithium', ARRAY['lithium'], 'company',
 true, false, true, false, 0.85, 9, 'processed'),

(3003, 'SQM', 'Sociedad Quimica y Minera', 'SQM Announces $2.2 Billion Expansion in Chilean Lithium Operations',
 'Chilean miner SQM plans major expansion to double lithium carbonate production capacity by 2027 amid surging EV demand.',
 'Bloomberg', '2025-01-25T16:45:00Z', 'https://example.com/news/sqm-expansion',
 ARRAY['SQM','lithium','Chile','expansion'], 'lithium', ARRAY['lithium'], 'company',
 true, true, true, false, 0.8, 9, 'processed'),

-- Copper News
(3004, 'FCX', 'Freeport-McMoRan Inc', 'Freeport Discovers New High-Grade Copper Zone at Grasberg',
 'Drilling results reveal significant copper-gold mineralization extending 500 meters below current workings with grades averaging 2.1% Cu and 1.2 g/t Au.',
 'Mining.com', '2025-01-26T11:00:00Z', 'https://example.com/news/fcx-discovery',
 ARRAY['FCX','copper','Indonesia','exploration'], 'copper', ARRAY['copper','gold'], 'exploration',
 true, true, false, false, 0.9, 10, 'processed'),

(3005, 'SCCO', 'Southern Copper', 'Southern Copper Completes Feasibility Study for Los Chancas Project',
 'Technical report shows NPV of $2.8 billion and IRR of 28% for the greenfield copper-molybdenum project in Peru.',
 'Company Release', '2025-01-25T08:30:00Z', 'https://example.com/news/scco-feasibility',
 ARRAY['SCCO','copper','Peru','feasibility'], 'copper', ARRAY['copper'], 'technical',
 true, true, true, true, 0.85, 10, 'processed'),

(3006, 'TECK', 'Teck Resources', 'Teck Approves $680 Million Highland Valley Copper Mill Expansion',
 'Expansion will increase throughput by 15% and extend mine life to 2050 at British Columbia operation.',
 'Northern Miner', '2025-01-24T13:20:00Z', 'https://example.com/news/teck-expansion',
 ARRAY['TECK','copper','Canada','expansion'], 'copper', ARRAY['copper'], 'company',
 true, true, true, false, 0.75, 8, 'processed'),

-- Uranium News
(3007, 'CCJ', 'Cameco Corporation', 'Cameco Signs 15-Year Supply Deal with European Utilities Consortium',
 'Agreement covers delivery of 60 million pounds U3O8 starting 2026, marking largest single contract in company history.',
 'World Nuclear News', '2025-01-26T07:45:00Z', 'https://example.com/news/ccj-contract',
 ARRAY['CCJ','uranium','nuclear','contracts'], 'uranium', ARRAY['uranium'], 'company',
 true, false, false, false, 0.9, 9, 'processed'),

(3008, 'NXE', 'NexGen Energy', 'NexGen Files Updated Technical Report Showing 30% Increase in Reserves',
 'Arrow deposit now hosts 389 million pounds U3O8 in proven and probable reserves with average grade of 4.35%.',
 'SEDAR', '2025-01-25T10:00:00Z', 'https://example.com/news/nxe-reserves',
 ARRAY['NXE','uranium','Saskatchewan','technical-report'], 'uranium', ARRAY['uranium'], 'technical',
 true, true, true, true, 0.88, 10, 'processed'),

(3009, 'DNN', 'Denison Mines', 'Denison Achieves First Uranium Production from ISR Test at Wheeler River',
 'Successful in-situ recovery test confirms technical viability of low-cost extraction method for high-grade deposit.',
 'Mining Journal', '2025-01-24T15:00:00Z', 'https://example.com/news/dnn-isr',
 ARRAY['DNN','uranium','ISR','production'], 'uranium', ARRAY['uranium'], 'company',
 true, true, false, false, 0.82, 9, 'processed'),

-- Rare Earth News
(3010, 'MP', 'MP Materials', 'MP Materials Achieves First Production of Separated Rare Earth Oxides',
 'Mountain Pass facility produces first commercial quantities of neodymium-praseodymium oxide for magnet production.',
 'Reuters', '2025-01-26T12:30:00Z', 'https://example.com/news/mp-production',
 ARRAY['MP','rare-earth','USA','production'], 'rare_earth', ARRAY['rare_earth'], 'company',
 true, true, false, false, 0.95, 10, 'processed'),

(3011, 'LYSCF', 'Lynas Corporation', 'Lynas Secures $500M US DoD Contract for Texas Processing Facility',
 'Department of Defense funding ensures domestic rare earth processing capability for critical defense applications.',
 'Defense News', '2025-01-25T14:00:00Z', 'https://example.com/news/lynas-dod',
 ARRAY['LYSCF','rare-earth','USA','government'], 'rare_earth', ARRAY['rare_earth'], 'regulatory',
 true, true, true, false, 0.9, 10, 'processed'),

-- Nickel & Battery Metals
(3012, 'VALE', 'Vale SA', 'Vale Announces Partnership with Tesla for Nickel Supply from Canada',
 'Multi-year agreement covers Class 1 nickel from Voisey Bay and Thompson operations for EV battery production.',
 'Financial Times', '2025-01-26T08:00:00Z', 'https://example.com/news/vale-tesla',
 ARRAY['VALE','nickel','batteries','Tesla'], 'nickel', ARRAY['nickel'], 'company',
 true, false, false, false, 0.85, 9, 'processed'),

(3013, 'BHP', 'BHP Group', 'BHP Commits $2.5 Billion to Nickel West Battery Materials Hub',
 'Investment transforms Australian nickel operations into integrated battery chemicals supplier for Asian markets.',
 'Australian Mining', '2025-01-24T10:30:00Z', 'https://example.com/news/bhp-nickel',
 ARRAY['BHP','nickel','batteries','Australia'], 'nickel', ARRAY['nickel','cobalt'], 'company',
 true, true, true, false, 0.8, 9, 'processed'),

-- Market & Regulatory News
(3014, 'MARKET', 'Market Update', 'Lithium Prices Rally 22% on China EV Sales Surge',
 'Spot lithium carbonate prices hit 6-month high as Chinese EV sales exceed expectations in January.',
 'Fastmarkets', '2025-01-26T06:00:00Z', 'https://example.com/news/lithium-rally',
 ARRAY['lithium','prices','China','EVs'], 'lithium', ARRAY['lithium'], 'market',
 true, false, false, false, 0.75, 8, 'processed'),

(3015, 'REGULATORY', 'Industry News', 'US Senate Passes Critical Minerals Security Act with Bipartisan Support',
 'Legislation provides $15 billion in funding for domestic mining projects and streamlines permitting for strategic minerals.',
 'Wall Street Journal', '2025-01-25T18:00:00Z', 'https://example.com/news/minerals-act',
 ARRAY['regulation','USA','critical-minerals','funding'], 'diversified', ARRAY['lithium','copper','rare_earth'], 'regulatory',
 true, false, true, false, 0.85, 10, 'processed')
ON CONFLICT (news_id) DO UPDATE SET
  headline = EXCLUDED.headline,
  summary = EXCLUDED.summary,
  datetime = EXCLUDED.datetime;