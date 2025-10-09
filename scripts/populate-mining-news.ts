import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NewsArticle {
  title: string;
  urls: string[];
  source: string;
  published_at: string;
  summary: string;
  commodities: string[];
  project_ids: string[];
  sentiment: 'Positive' | 'Negative' | 'Neutral';
}

const miningNewsArticles: NewsArticle[] = [
  // LITHIUM NEWS
  {
    title: "Pilbara Minerals Achieves Record Spodumene Production for FY2025",
    urls: ["https://www.mining.com/pilbara-minerals-fy2025-record-production/"],
    source: "Mining.com",
    published_at: "2025-08-25T08:30:00Z",
    summary: "Pilbara Minerals achieved record spodumene concentrate production of 754,600 tonnes for fiscal year 2025, exceeding the top-end guidance. The company's P680 and P1000 expansion projects enhanced processing capacity at the Pilgangoora operation.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Pilbara Minerals June Quarter Production Surges 77%",
    urls: ["https://www.australianmining.com.au/pilbara-minerals-june-quarter-production/"],
    source: "Australian Mining",
    published_at: "2025-07-30T10:00:00Z",
    summary: "Pilbara Minerals produced 221,300 tonnes of spodumene concentrate in the June 2025 quarter, a 77% jump from the prior quarter. Sales increased 7% year-on-year to 760,100 tonnes despite challenging lithium prices.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Rio Tinto Completes $6.7B Acquisition of Arcadium Lithium",
    urls: ["https://www.riotinto.com/en/news/releases/2025/rio-tinto-completes-acquisition-of-arcadium-lithium"],
    source: "Rio Tinto",
    published_at: "2025-03-15T09:00:00Z",
    summary: "Rio Tinto completed its $6.7 billion acquisition of Arcadium Lithium, establishing itself as the world's third largest lithium miner. The deal received regulatory approvals from Australia, Canada, China, Japan, South Korea, the UK and the US.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Liontown Resources Officially Opens Kathleen Valley Lithium Mine",
    urls: ["https://www.ltresources.com.au/kathleen-valley-opening/"],
    source: "Mining Technology",
    published_at: "2025-07-10T07:00:00Z",
    summary: "Liontown Resources officially opened its Kathleen Valley Lithium Operation, marking Australia's first underground lithium mine. The operation features one of the country's largest off-grid hybrid renewable power stations and targets 2.8Mtpa initial capacity.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Liontown Secures $226M Capital Raise for Underground Transition",
    urls: ["https://www.ltresources.com.au/capital-raise-2025/"],
    source: "Discovery Alert",
    published_at: "2025-06-20T08:30:00Z",
    summary: "Liontown Resources secured $226 million to advance the underground transition at Kathleen Valley. The National Reconstruction Fund Corporation invested $50 million to support the ramp-up of Australia's first underground lithium mine.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Ganfeng Lithium Begins Production at Mali's Goulamina Project",
    urls: ["https://www.mining.com/ganfeng-begins-production-at-goulamina-lithium-mine/"],
    source: "Mining.com",
    published_at: "2025-01-10T09:00:00Z",
    summary: "Ganfeng Lithium commenced production at the Goulamina spodumene project in Mali. The first phase targets annual output of 506,000 tonnes of lithium concentrate, with plans to expand to 1 million tonnes in the second phase.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Ganfeng and Lithium Argentina Form Major JV in Argentina",
    urls: ["https://investors.lithium-argentina.com/ganfeng-jv-announcement/"],
    source: "Lithium Argentina",
    published_at: "2025-08-12T07:00:00Z",
    summary: "Ganfeng Lithium and Lithium Argentina formed a joint venture consolidating major lithium projects in Argentina. The partnership will hold 67% Ganfeng and 33% Lithium Argentina, targeting phased production capacity of 150,000 tpa LCE.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Albemarle Reports Record Lithium Production Despite Q1 2025 Loss",
    urls: ["https://finance.yahoo.com/albemarle-q1-2025-results/"],
    source: "Yahoo Finance",
    published_at: "2025-05-01T08:00:00Z",
    summary: "Albemarle reported record lithium production in Q1 2025 while posting a net loss of $340,000. The company's Salar de Atacama operation in Chile maintains production costs of approximately $3,500 per ton, among the lowest globally.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Albemarle Delays $1.3B South Carolina Lithium Refinery",
    urls: ["https://www.mining.com/albemarle-delays-south-carolina-refinery/"],
    source: "Mining.com",
    published_at: "2025-04-15T10:00:00Z",
    summary: "Albemarle paused its $1.3 billion South Carolina lithium refinery project amid the price collapse. CEO Kent Masters stated 'The math doesn't work today' as lithium prices remain at multi-year lows.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "Albemarle Posts Surprise Q2 2025 Profit Amid Market Challenges",
    urls: ["https://www.mining.com/albemarle-q2-profit-2025/"],
    source: "Mining.com",
    published_at: "2025-08-01T08:30:00Z",
    summary: "Albemarle posted a surprise Q2 2025 profit, demonstrating operational resilience during challenging market conditions. About 40% of global lithium supply capacity is at or below breakeven, with a third already idled.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Chile Regulator Approves Codelco-SQM Lithium Partnership",
    urls: ["https://www.mining.com/chile-approves-codelco-sqm-lithium-partnership/"],
    source: "Mining.com",
    published_at: "2025-09-15T09:00:00Z",
    summary: "Chile's competition regulator approved the strategic partnership between state-owned Codelco and SQM. Codelco will hold 50% plus one share, giving it control aligned with President Boric's National Lithium Strategy. Operations begin in 2025.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "SQM Plans to Lift Lithium Production to 230,000 MT in 2025",
    urls: ["https://cilive.com/sqm-lithium-production-2025/"],
    source: "CI Live",
    published_at: "2025-01-20T08:00:00Z",
    summary: "SQM plans to ramp up lithium production to 230,000 mt in 2025 as it expands capacity in Australia, Chile and China. However, the company reduced capital expenditure to $1.1 billion from $1.6 billion due to the lithium price slump.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Thacker Pass Lithium Mine Faces Water Rights Challenges",
    urls: ["https://thenevadaindependent.com/thacker-pass-water-rights-2025/"],
    source: "Nevada Independent",
    published_at: "2025-06-20T10:00:00Z",
    summary: "Nevada issued a cease and desist order to Lithium Nevada Corp for unauthorized water pumping at Thacker Pass. The state found the company continued using wells despite water permits being invalidated after a court ruling in April 2025.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "DOE Takes 5% Stake in Thacker Pass Lithium Project",
    urls: ["https://www.doi.gov/thacker-pass-doe-investment/"],
    source: "U.S. Department of Energy",
    published_at: "2025-10-02T09:00:00Z",
    summary: "The Department of Energy took a 5% equity stake in Lithium Americas and the Thacker Pass lithium mining project. The project is a joint venture with General Motors and lithium production is expected at full capacity in 2028.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Salton Sea Hell's Kitchen Lithium Project Gets Judge Approval",
    urls: ["https://calmatters.org/salton-sea-lithium-mining-approval/"],
    source: "CalMatters",
    published_at: "2025-01-28T08:00:00Z",
    summary: "An Imperial County judge cleared the way for the Hell's Kitchen project at the Salton Sea, one of the world's largest lithium mines. The ruling ended a lawsuit from environmental advocates opposing the project.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Lithium Carbonate Prices Bottom at $8,329/MT in Q2 2025",
    urls: ["https://investingnews.com/lithium-price-update-q2-2025/"],
    source: "Investing News",
    published_at: "2025-06-24T10:00:00Z",
    summary: "Battery-grade lithium carbonate prices bottomed at $8,329.08 per metric ton in late June 2025, the lowest level since January 2021. Prices fell through Q1 and Q2 despite starting the year at $10,484.37 per metric ton.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "Goldman Sachs Forecasts Lithium Price Recovery to $11,000/MT",
    urls: ["https://www.mining.com/goldman-sachs-lithium-forecast-2025/"],
    source: "Mining.com",
    published_at: "2025-07-15T09:00:00Z",
    summary: "Goldman Sachs forecasts battery-grade lithium carbonate climbing to $11,000/mt in 2025 and $13,250/mt in 2026, driven by rising EV penetration and the exit of high-cost producers. Prices are approximately 15% above current spot levels.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Tesla and Yahua Sign Three-Year Lithium Supply Agreement",
    urls: ["https://www.mining.com/tesla-yahua-lithium-supply-deal/"],
    source: "Mining.com",
    published_at: "2024-06-15T08:00:00Z",
    summary: "Tesla and Sichuan Yahua Industrial Group signed a three-year lithium carbonate supply agreement for 2025-2027. Yahua will also supply battery-grade lithium hydroxide to Tesla through 2030 under a separate agreement.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Tesla's Texas Lithium Refinery Begins Production Operations",
    urls: ["https://cen.acs.org/tesla-lithium-refinery-texas/"],
    source: "C&EN",
    published_at: "2024-12-10T09:00:00Z",
    summary: "Tesla's lithium refinery near Corpus Christi, Texas officially began operations with a $375 million investment. The facility has annual capacity sufficient to support battery production for over 1 million EVs and began feeding raw materials in late 2024.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Core Lithium Presents Finniss Operation Restart Study",
    urls: ["https://www.corelithium.com.au/finniss-restart-study/"],
    source: "Australian Mining",
    published_at: "2025-06-30T08:00:00Z",
    summary: "Core Lithium presented the Restart Study outcomes for its Finniss Lithium Operation near Darwin. The quarterly report outlined plans to resume operations at the Northern Territory project subject to market conditions.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Neutral"
  },

  // COPPER NEWS
  {
    title: "BHP Announces $840M Investment in Olympic Dam Copper Expansion",
    urls: ["https://www.indailysa.com.au/bhp-olympic-dam-investment-2025/"],
    source: "InDaily",
    published_at: "2025-10-01T08:00:00Z",
    summary: "BHP announced an $840 million investment package for Olympic Dam in South Australia to strengthen underground mining productivity and expand copper processing capabilities. The investment includes a new tunnel to access the Southern Area and infrastructure to expand ore processing.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "BHP Produces Record 2 Million Tonnes of Copper in FY25",
    urls: ["https://carboncredits.com/bhp-copper-production-fy25/"],
    source: "Carbon Credits",
    published_at: "2025-08-15T09:00:00Z",
    summary: "BHP produced over 2 million tonnes of copper for the first time in FY25, a 28% increase over three years. Copper contributed 45% of BHP's total underlying EBITDA in FY25, up from 29% in FY24, with half of capital expenditure now directed to copper.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "BHP Plans $10.7-14.7B Chile Copper Expansion Over Decade",
    urls: ["https://www.mining.com/bhp-chile-copper-expansion-plans/"],
    source: "Mining.com",
    published_at: "2025-05-20T08:30:00Z",
    summary: "BHP announced ambitious plans for Escondida mine and other Chilean operations with investments ranging from $10.7 billion to $14.7 billion over the next decade. Earliest projects target first production between 2027-2028, with later projects between 2031-2032.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Capstone Copper Announces 2024 Results and 2025 Guidance",
    urls: ["https://capstonecopper.com/2024-production-2025-guidance/"],
    source: "Capstone Copper",
    published_at: "2025-01-15T08:00:00Z",
    summary: "Capstone Copper announced 2024 production results and provided 2025 guidance. Copper production at Mantoverde is forecasted to significantly increase in 2025 driven by the new sulphide concentrator coming online.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Global Copper Surplus to Double to 289,000 Tonnes in 2025",
    urls: ["https://www.mining.com/global-copper-surplus-forecast-2025/"],
    source: "Mining.com",
    published_at: "2025-02-10T09:00:00Z",
    summary: "The International Copper Study Group forecasts global copper surplus will reach 289,000 tonnes in 2025, more than double the 138,000 tonnes from 2024. However, some analysts believe the market may have already entered a supply deficit.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Kamoa-Kakula Copper Output Grows 31% in H1 2025",
    urls: ["https://www.ecofinagency.com/kamoa-kakula-copper-h1-2025/"],
    source: "Ecofin Agency",
    published_at: "2025-08-07T08:00:00Z",
    summary: "Kamoa-Kakula produced 245,127 tonnes of copper concentrate in H1 2025, a 31% increase from the same period in 2024. The mine is Africa's largest copper operation with annual capacity of approximately 600,000 tonnes.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Ivanhoe Revises Kamoa-Kakula Production Forecast After Seismic Event",
    urls: ["https://www.mining.com/ivanhoe-kamoa-kakula-production-revision/"],
    source: "Mining.com",
    published_at: "2025-06-15T10:00:00Z",
    summary: "Ivanhoe Mines revised Kamoa-Kakula's 2025 production forecast to 370,000-420,000 tonnes from 520,000-580,000 tonnes after seismic activity prompted a suspension at the Kakula underground mine from May to early June.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "KoBold Metals Plans $2B Investment in Zambian Copper Mine",
    urls: ["https://www.bloomberg.com/news/kobold-zambia-copper-investment/"],
    source: "Bloomberg",
    published_at: "2025-02-04T09:00:00Z",
    summary: "KoBold Metals is developing the Mingomba deposits in Zambia with a $2 billion investment, described as the largest high-grade undeveloped copper project. The mine will produce more than 300,000 tonnes of copper annually by the mid-2030s.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "First Quantum Receives Panama Approval for Cobre Panamá Preservation",
    urls: ["https://www.first-quantum.com/cobre-panama-preservation-approval/"],
    source: "First Quantum Minerals",
    published_at: "2025-05-15T08:00:00Z",
    summary: "First Quantum received approval from Panama's government for a Preservation and Safe Management program at Cobre Panamá. The approval allowed export of 121,000 dry metric tonnes of stored copper concentrate to fund preservation activities.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Panama Prepares Talks with First Quantum on Cobre Panamá Restart",
    urls: ["https://www.mining.com/panama-first-quantum-restart-talks/"],
    source: "Mining.com",
    published_at: "2025-09-20T09:00:00Z",
    summary: "Panama is preparing to open talks with First Quantum on the possible restart of Cobre Panamá, with discussions expected to begin late 2025 or early 2026. A comprehensive environmental audit is starting in the coming weeks.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Anglo American Quellaveco Produces 79,900 Tonnes in Q1 2025",
    urls: ["https://www.bnamericas.com/quellaveco-q1-2025-production/"],
    source: "BNamericas",
    published_at: "2025-04-15T08:00:00Z",
    summary: "Anglo American's Quellaveco mine in Peru produced 79,900 tonnes of copper in Q1 2025, up from 72,000 tonnes the year prior. The mine contributed over 10% of Peru's copper output in the quarter.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Anglo American Plans Quellaveco Debottlenecking and Expansion",
    urls: ["https://im-mining.com/anglo-american-quellaveco-expansion/"],
    source: "International Mining",
    published_at: "2025-07-31T08:30:00Z",
    summary: "Anglo American is set to boost throughput at Quellaveco copper mine in Peru through plant debottlenecking and capacity increases. Early studies support long-term expansion, with exploration drilling below the current pit shell yielding promising results.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "India Acquires Greenfield Land in Zambia for Copper-Cobalt Exploration",
    urls: ["https://agmetalminer.com/india-zambia-copper-investment/"],
    source: "AG Metal Miner",
    published_at: "2025-03-28T09:00:00Z",
    summary: "The Government of India acquired greenfield land in Zambia's northwest province with plans to explore copper and cobalt. China faces increasing competition in Africa from countries like India trying to secure their own critical mineral supply chains.",
    commodities: ["Copper", "Cobalt"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Goldman Sachs Raises Q2/Q3 Copper Price Forecast",
    urls: ["https://www.mining.com/goldman-sachs-copper-forecast-revision/"],
    source: "Mining.com",
    published_at: "2025-05-10T08:00:00Z",
    summary: "Goldman Sachs raised its near-term copper forecast, upgrading Q2/Q3 price forecast to $9,330-$9,150 per tonne from $8,620-$8,370 previously. Demand for copper grew at a higher rate than refined output during Q1 2025.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Copper Industry Needs $2.1 Trillion Investment Over 25 Years",
    urls: ["https://www.mining.com/copper-industry-investment-requirements/"],
    source: "Mining.com",
    published_at: "2025-03-15T09:00:00Z",
    summary: "The copper industry needs to invest $2.1 trillion over the next 25 years to meet growing demand from electrification. BHP estimates the copper deficit will be around 10 million tons by 2035, requiring $250 billion to develop enough mines.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Neutral"
  },

  // RARE EARTH ELEMENTS NEWS
  {
    title: "MP Materials Receives $400M DOD Investment for Rare Earth Production",
    urls: ["https://mpmaterials.com/dod-partnership-announcement/"],
    source: "MP Materials",
    published_at: "2025-07-15T08:00:00Z",
    summary: "The Department of Defense agreed to buy $400 million of preferred stocks in MP Materials, becoming the company's largest shareholder. The investment supports a new 10X Facility expected to begin commissioning in 2028 with 10,000 metric tons magnet capacity.",
    commodities: ["Rare Earths"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "DOD Issues $150M Loan to MP Materials for Heavy Rare Earth Separation",
    urls: ["https://www.war.gov/News/mp-materials-dod-loan/"],
    source: "U.S. Department of Defense",
    published_at: "2025-08-14T09:00:00Z",
    summary: "The DOD's Office of Strategic Capital provided $150 million to MP Materials for upgrades to its Mountain Pass rare earth processing facility. Funding supports addition of heavy rare earth separation capabilities at the only operational US rare earth mine.",
    commodities: ["Rare Earths"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Apple Invests $500M in MP Materials Rare Earth Production",
    urls: ["https://abc7.com/mp-materials-apple-investment/"],
    source: "ABC7",
    published_at: "2025-07-20T08:00:00Z",
    summary: "Apple announced a $500 million investment in MP Materials following the Trump administration's efforts to reduce US reliance on China for rare earth elements. MP Materials produces more than 10% of the world's rare earth supply.",
    commodities: ["Rare Earths"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "MP Materials Halts China Shipments Amid Trade Tensions",
    urls: ["https://www.mining.com/mp-materials-china-export-halt/"],
    source: "Mining.com",
    published_at: "2025-04-10T09:00:00Z",
    summary: "MP Materials halted all shipments to China in 2025 after steep tariffs and new export restrictions. The company shifted to processing output domestically and selling to US-aligned markets like Japan and South Korea.",
    commodities: ["Rare Earths"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Canada Invests $10M in Torngat Metals Strange Lake REE Project",
    urls: ["https://www.canada.ca/torngat-metals-strange-lake-funding/"],
    source: "Government of Canada",
    published_at: "2024-12-15T08:00:00Z",
    summary: "Canada announced up to $10 million in infrastructure funding for Torngat Metals' Strange Lake project in northern Quebec and Labrador. The project contains globally significant quantities of heavy and light rare earths including dysprosium and neodymium.",
    commodities: ["Rare Earths"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Energy Fuels Announces Commercial US Rare Earth Production",
    urls: ["https://www.prnewswire.com/energy-fuels-2024-results/"],
    source: "PR Newswire",
    published_at: "2025-01-20T08:00:00Z",
    summary: "Energy Fuels announced 2024 results including active US uranium mining and commercial US rare earth production. The company operates the only commercial rare earth separation facility in North America.",
    commodities: ["Rare Earths", "Uranium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "China Imposes Export Bans on Critical Rare Earth Minerals",
    urls: ["https://www.scmp.com/china-rare-earth-export-controls/"],
    source: "South China Morning Post",
    published_at: "2024-12-10T09:00:00Z",
    summary: "China imposed export bans on gallium, germanium, and antimony in December 2024, metals used in semiconductors and defense applications. This follows earlier restrictions as part of China's broader strategy to control critical mineral exports.",
    commodities: ["Rare Earths"],
    project_ids: [],
    sentiment: "Negative"
  },

  // NICKEL NEWS
  {
    title: "BHP Halts Western Australia Nickel Operations",
    urls: ["https://www.mining.com/bhp-halts-wa-nickel-operations/"],
    source: "Mining.com",
    published_at: "2024-10-15T08:00:00Z",
    summary: "BHP halted its Western Australia nickel operations due to substantial decline in nickel prices and global oversupply. The company will review the decision by February 2027. Nickel prices dropped 40% and have continued declining due to Indonesian supply.",
    commodities: ["Nickel"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "Nickel Prices Remain Under Pressure at $15,000-16,000/MT Range",
    urls: ["https://investingnews.com/nickel-price-update-q2-2025/"],
    source: "Investing News",
    published_at: "2025-06-15T09:00:00Z",
    summary: "After spiking above $20,000 per metric ton in May 2024, nickel prices have experienced a downward trend, mainly remaining in the $15,000 to $16,000 range. Indonesia's elevated production levels contribute to sustained low prices.",
    commodities: ["Nickel"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "Indonesia's Nickel Output to Surge 8.5% in 2025",
    urls: ["https://www.mining.com/indonesia-nickel-production-forecast/"],
    source: "Mining.com",
    published_at: "2025-01-25T08:00:00Z",
    summary: "S&P Global forecasts global nickel output will surge an additional 8.5% in 2025, with Indonesia's share growing to 63.4% from 61.6%. Global primary nickel demand is expected to grow 2.8% year-on-year.",
    commodities: ["Nickel"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Australian Government Adds Nickel to Critical Minerals List",
    urls: ["https://www.australianmining.com.au/nickel-critical-minerals-list/"],
    source: "Australian Mining",
    published_at: "2024-02-20T08:00:00Z",
    summary: "The Federal Government added nickel to the Critical Minerals List in early 2024, and the Western Australian Government cut royalties tax by 50% for 18 months in response to industry challenges and declining prices.",
    commodities: ["Nickel"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Study Reveals Nickel Mining Land Footprint Up to 500x Greater",
    urls: ["https://www.uq.edu.au/news/nickel-mining-climate-concern/"],
    source: "University of Queensland",
    published_at: "2025-01-15T09:00:00Z",
    summary: "A University of Queensland study found the land footprint of nickel mining could be 4 to 500 times greater than previously reported. This raises concerns about the environmental impact of nickel extraction needed for clean energy technologies.",
    commodities: ["Nickel"],
    project_ids: [],
    sentiment: "Negative"
  },

  // GRAPHITE NEWS
  {
    title: "US Tariffs on Chinese Graphite Anodes Rise to 45%",
    urls: ["https://investingnews.com/graphite-market-h1-2025/"],
    source: "Investing News",
    published_at: "2025-03-15T08:00:00Z",
    summary: "US tariffs on imports of Chinese synthetic graphite anodes rose from 0% in June 2024 to 45% in March 2025, with potential for an additional 25-45% in tariffs. China dominates with 99% of global anode output.",
    commodities: ["Graphite"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Graphite Demand From Battery Sector to Overtake Steel by Late 2025",
    urls: ["https://www.fastmarkets.com/graphite-battery-demand-2025/"],
    source: "Fastmarkets",
    published_at: "2025-08-20T09:00:00Z",
    summary: "Industry analysts project that by late 2025, graphite demand from the battery sector will overtake traditional steel sector demand for the first time. Global demand for battery-grade graphite is projected to surge by 600% over the next decade.",
    commodities: ["Graphite"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Syrah Resources Restarts Balama Graphite Operations After Force Majeure",
    urls: ["https://www.mining-technology.com/syrah-resources-balama-graphite/"],
    source: "Mining Technology",
    published_at: "2025-05-20T08:00:00Z",
    summary: "Syrah Resources aimed to resume natural graphite production at Balama before end of June 2025 quarter after lifting its eight-month force majeure declaration. The operation was disrupted by civil unrest following Mozambique's election results.",
    commodities: ["Graphite"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Syrah Resources Secures DFC Waiver After Balama Disruption",
    urls: ["https://www.sharecafe.com.au/syrah-resources-dfc-waiver/"],
    source: "ShareCafe",
    published_at: "2025-01-15T08:30:00Z",
    summary: "Syrah Resources secured a waiver for default events under its US International DFC loan of $150m after the Balama disruption. The DFC deferred the first half-yearly interest payment due in mid-May 2025.",
    commodities: ["Graphite"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "NextSource Materials Signs Offtake Agreement with Mitsubishi",
    urls: ["https://www.juniorminingnetwork.com/nextsource-mitsubishi-offtake/"],
    source: "Junior Mining Network",
    published_at: "2025-04-10T08:00:00Z",
    summary: "NextSource Materials executed a binding offtake agreement with Mitsubishi Chemical Group Corporation to supply SuperFlake graphite anode material. The agreement strengthens NextSource's position in the battery materials supply chain.",
    commodities: ["Graphite"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Graphite Prices Fall 10-20% in 2024 on Oversupply",
    urls: ["https://investingnews.com/graphite-prices-2024-decline/"],
    source: "Investing News",
    published_at: "2024-12-15T09:00:00Z",
    summary: "Prices for graphite fell by 10 to 20 percent in 2024, with China battery-related flake graphite spot prices slightly lower. Oversupply and trade concerns were the most impactful factors in the graphite market in 2024.",
    commodities: ["Graphite"],
    project_ids: [],
    sentiment: "Negative"
  },

  // COBALT NEWS
  {
    title: "Africa's First Cobalt Sulfate Refinery to Commission by Late 2025",
    urls: ["https://furtherafrica.com/zambia-cobalt-refinery-2025/"],
    source: "FurtherAfrica",
    published_at: "2025-08-07T08:00:00Z",
    summary: "Africa's first cobalt sulfate refinery, spearheaded by Kobaloni Energy with $100 million backing from Vision Blue and Africa Finance Corporation, will be commissioned by late 2025. This marks a significant milestone for African battery materials processing.",
    commodities: ["Cobalt"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Cobalt Prices Fall 10-20% in 2024 on Oversupply",
    urls: ["https://www.cobaltinstitute.org/cobalt-market-report-2024/"],
    source: "Cobalt Institute",
    published_at: "2025-05-15T09:00:00Z",
    summary: "Cobalt prices dropped by 10 to 20 percent in 2024, joining lithium, graphite, and nickel in significant price declines. Market oversupply and reduced demand from the EV sector contributed to the price weakness.",
    commodities: ["Cobalt"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "Kamoa Copper Signs 30 MW Renewable Energy Agreement",
    urls: ["https://crossboundaryenergy.com/kamoa-copper-renewable-energy/"],
    source: "CrossBoundary Energy",
    published_at: "2025-08-01T08:00:00Z",
    summary: "Kamoa Copper S.A. and CrossBoundary Energy signed a power purchase agreement for a 30 MW baseload renewable energy supply. Construction is due to start in August 2025, supporting the copper-cobalt operation's sustainability goals.",
    commodities: ["Copper", "Cobalt"],
    project_ids: [],
    sentiment: "Positive"
  },

  // MINING M&A AND CORPORATE NEWS
  {
    title: "Rio Tinto Partners with Codelco for Chilean Lithium Mine",
    urls: ["https://www.mining.com/rio-tinto-codelco-lithium-partnership/"],
    source: "Mining.com",
    published_at: "2025-05-15T08:00:00Z",
    summary: "Rio Tinto partnered with Chilean state-owned Codelco for a lithium mine in northern Chile, making it the third private company to mine lithium in Chile. Rio Tinto will invest $900 million and own just under half of the operation.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Glencore's Portovesme Hub Selected as EU Strategic Project",
    urls: ["https://www.glencore.com/portovesme-eu-strategic-project/"],
    source: "Glencore",
    published_at: "2025-03-15T09:00:00Z",
    summary: "Glencore's Portovesme Critical Raw Materials Hub was chosen by the European Commission as one of the first 47 designated Strategic Projects under the EU's Critical Raw Materials Act. The Sardinia facility will establish a fully European battery recycling value chain.",
    commodities: ["Lithium", "Nickel", "Cobalt"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Glencore Makes Third Investment in Stillwater Critical Minerals",
    urls: ["https://criticalminerals.com/stillwater-glencore-investment/"],
    source: "Stillwater Critical Minerals",
    published_at: "2025-08-15T08:00:00Z",
    summary: "Glencore made a third investment in Stillwater Critical Minerals at a 64% premium to the June 2024 financing. Glencore now holds a 15% strategic equity position with representation on Stillwater's board.",
    commodities: ["Platinum Group Metals"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Former Glencore Executive Launches Critical Minerals Processing Firm",
    urls: ["https://www.mining.com/valor-critical-minerals-processing/"],
    source: "Mining.com",
    published_at: "2025-09-15T08:00:00Z",
    summary: "Former Glencore recycling head Kunal Sinha launched Valor, a New York-based processing startup with University of Illinois technology. The company aims to lower the cost and time to refine copper and other critical minerals.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Pilbara Minerals-Latin Resources $560M Deal Approved",
    urls: ["https://www.mining.com/pilbara-latin-resources-deal-approval/"],
    source: "Mining.com",
    published_at: "2025-01-25T08:00:00Z",
    summary: "The AU$560 million Pilbara Minerals-Latin Resources deal was approved by the Western Australia Government. A court approved the transaction, and Zijin Mining gained a 24.82% interest in Chinese lithium/copper/potash miner Zangge for RMB 13.7B.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Piedmont Lithium Completes Merger in August 2025",
    urls: ["https://www.juniorminingnetwork.com/piedmont-lithium-merger/"],
    source: "Junior Mining Network",
    published_at: "2025-08-20T08:00:00Z",
    summary: "Piedmont Lithium announced the successful completion of its merger in August 2025. The transaction strengthens the company's position in North American lithium supply chains.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },

  // MINING POLICY AND REGULATION
  {
    title: "Trump Administration Expedites Mining Permits with 10-Day Approval",
    urls: ["https://insideclimatenews.org/trump-mining-permits-executive-order/"],
    source: "Inside Climate News",
    published_at: "2025-03-21T08:00:00Z",
    summary: "The Trump administration issued an executive order requiring federal agencies to identify priority mining projects that can be immediately approved within 10 days. More than 30 total mining projects are now involved in the FAST-41 expedited permitting program.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Trump Administration Announces 3 New Critical Mining Projects to FAST-41",
    urls: ["https://www.permitting.gov/critical-mining-projects-announcement/"],
    source: "Federal Permitting Council",
    published_at: "2025-05-05T09:00:00Z",
    summary: "The Trump administration added three new critical mining projects to the federal permitting dashboard under FAST-41. Projects include Glencore-Teck's NorthMet copper/nickel project in Minnesota and other strategic mineral developments.",
    commodities: ["Copper", "Nickel"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Canada Advances Critical Minerals Strategy at PDAC 2025",
    urls: ["https://www.canada.ca/pdac-2025-critical-minerals/"],
    source: "Government of Canada",
    published_at: "2025-03-10T08:00:00Z",
    summary: "Canada showcased progress in the critical minerals sector at PDAC 2025. Since launching the Canadian Critical Minerals Strategy in 2022, the government has made over $700 million in investments and catalyzed a 15% increase in production.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Canada Announces $80.3M for Critical Minerals Supply Chains",
    urls: ["https://www.canada.ca/g7-critical-minerals-investment/"],
    source: "Government of Canada",
    published_at: "2025-10-01T08:00:00Z",
    summary: "At the 2025 G7 Leaders Summit, Prime Minister Mark Carney announced $80.3 million to build reliable critical minerals supply chains, including $50.3 million for domestic R&D initiatives and strengthening global supply chains.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Nova Scotia Adds 4 Minerals to Critical Minerals List",
    urls: ["https://news.novascotia.ca/nova-scotia-critical-minerals-update/"],
    source: "Government of Nova Scotia",
    published_at: "2025-05-14T08:00:00Z",
    summary: "Nova Scotia added four more minerals to its critical minerals list, bringing the total to 20. New additions include high purity silica, silver, and tellurium used for solar panels, plus four new strategic minerals.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Trump Executive Order Streamlines Offshore Critical Minerals Development",
    urls: ["https://www.whitehouse.gov/offshore-critical-minerals-executive-order/"],
    source: "The White House",
    published_at: "2025-04-24T09:00:00Z",
    summary: "The Trump Administration released an Executive Order titled 'Unleashing America's Offshore Critical Minerals Resources' to accelerate responsible development of seabed mineral resources and expand domestic critical mineral production.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Positive"
  },

  // MINING TECHNOLOGY AND INNOVATION
  {
    title: "BHP and Rio Tinto Partner on Battery-Electric Haul Truck Trial",
    urls: ["https://www.mining.com/bhp-rio-tinto-electric-haul-trucks/"],
    source: "Mining.com",
    published_at: "2024-11-15T08:00:00Z",
    summary: "BHP and Rio Tinto partnered to expedite the first trial of Komatsu and Caterpillar's battery-electric haul truck technology. The collaboration aims to reduce emissions and operational costs in mining operations.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Mining Robotics Market to Reach $3.70B by 2034",
    urls: ["https://www.csgtalent.com/mining-technology-2025/"],
    source: "CSG Talent",
    published_at: "2025-02-20T09:00:00Z",
    summary: "The global mining robotics market is currently valued at $1.58 billion and is forecasted to reach $3.70 billion by 2034, growing at a CAGR of 9.91%. Remote Operations Centres now manage fleets from hundreds of miles away.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Autonomous Mining Equipment Market to Double to $6.2B by 2026",
    urls: ["https://www.weforum.org/mining-innovation-2025/"],
    source: "World Economic Forum",
    published_at: "2025-01-30T08:00:00Z",
    summary: "The global market for autonomous mining equipment is projected to grow from $3.1 billion in 2020 to $6.2 billion by 2026. Companies implementing automation and AI have reported up to a 30% reduction in operational costs.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Digital Mining Operations Report 25-40% Waste Reduction",
    urls: ["https://www.weforum.org/sustainable-mining-technology/"],
    source: "World Economic Forum",
    published_at: "2025-03-15T09:00:00Z",
    summary: "Digitally-optimized mining operations consistently report 25-40% reductions in waste material production compared to traditional methods. AI-driven optimization and sensor-based ore sorting help mines reduce emissions and energy consumption.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Positive"
  },

  // ESG AND SUSTAINABILITY
  {
    title: "New IFRS Sustainability Standards Take Effect in 2025",
    urls: ["https://www.canadianminingjournal.com/mining-esg-trends-2025/"],
    source: "Canadian Mining Journal",
    published_at: "2025-01-15T08:00:00Z",
    summary: "In 2025, first reports under International Financial Reporting Standards (IFRS) S1 and S2 are expected, with at least 20 countries representing over half of global GDP having committed to adoption. Thousands of companies will begin reporting under EU CSRD.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Consolidated Mining Standards Initiative Launches Global Framework",
    urls: ["https://www.smenet.org/esg/cmsi-launch/"],
    source: "SME",
    published_at: "2025-02-20T08:00:00Z",
    summary: "The Consolidated Mining Standards Initiative (CMSI) aims to bring together the best aspects of four well-established standards into one global standard. The framework reduces complexity and clarifies responsible practices for mining operations.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Syrah's Balama Becomes First Graphite Operation to Complete IRMA Audit",
    urls: ["https://responsiblemining.net/syrah-balama-irma-audit/"],
    source: "IRMA",
    published_at: "2024-12-19T09:00:00Z",
    summary: "Syrah Resources' Balama graphite operation became the first graphite operation to complete an IRMA audit. The facility achieved IRMA 50 after SCS Global Services measured its performance versus the Standard's 400+ criteria.",
    commodities: ["Graphite"],
    project_ids: [],
    sentiment: "Positive"
  },

  // EXPLORATION AND DISCOVERIES
  {
    title: "Prospector Metals Discovers High-Grade TESS Gold-Copper Zone",
    urls: ["https://www.juniorminingnetwork.com/prospector-metals-discovery/"],
    source: "Junior Mining Network",
    published_at: "2025-10-01T08:00:00Z",
    summary: "Prospector Metals shares surged from C$0.31 to C$1.17 after reporting discovery of the new TESS gold-copper zone. A drill hole intersected a broad, high-grade zone averaging 13.79 g/t gold from 62 meters to 106 meters downhole.",
    commodities: ["Gold", "Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Sterling Metals Discovers Large-Scale Bornite at Soo Copper Project",
    urls: ["https://www.juniorminingnetwork.com/sterling-metals-discovery/"],
    source: "Junior Mining Network",
    published_at: "2025-10-05T08:30:00Z",
    summary: "Sterling Metals Corp announced the discovery of large-scale bornite in outcrop at its Soo Copper Project. The discovery highlights the project's potential for significant copper mineralization.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "F3 Uranium Announces Fall Drill Program at Broach Lake",
    urls: ["https://www.juniorminingnetwork.com/f3-uranium-drill-program/"],
    source: "Junior Mining Network",
    published_at: "2025-10-01T08:00:00Z",
    summary: "F3 Uranium Corp announced a fall drill program at its Broach Lake Property, focusing on the recently discovered high-grade Tetra Zone. The program aims to expand the known mineralization footprint.",
    commodities: ["Uranium"],
    project_ids: [],
    sentiment: "Positive"
  },

  // MARKET ANALYSIS AND FORECASTS
  {
    title: "IEA Projects Critical Minerals Demand to Surge Through 2030",
    urls: ["https://www.iea.org/global-critical-minerals-outlook-2025/"],
    source: "IEA",
    published_at: "2025-01-20T08:00:00Z",
    summary: "The IEA's Global Critical Minerals Outlook 2025 projects surging demand for lithium, copper, nickel and rare earths driven by clean energy transitions. Supply chains remain concentrated, raising concerns about resilience and security.",
    commodities: ["Lithium", "Copper", "Nickel", "Rare Earths"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "S&P Forecasts Lithium Surplus to Narrow to 33,000 MT in 2025",
    urls: ["https://investingnews.com/lithium-forecast-2025/"],
    source: "Investing News",
    published_at: "2025-01-15T09:00:00Z",
    summary: "S&P Global forecasts the lithium surplus to narrow to 33,000 metric tons in 2025, down from 84,000 metric tons in 2024. Global lithium demand is expected to increase 26% to 1.46 million tonnes in 2025 on an LCE basis.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Lithium Demand Rose 30% in 2024, Exceeding Historical Growth Rates",
    urls: ["https://www.iea.org/critical-minerals-demand-2024/"],
    source: "IEA",
    published_at: "2025-02-10T08:00:00Z",
    summary: "Lithium demand rose by nearly 30% in 2024, significantly exceeding the 10% annual growth rate seen in the 2010s. Despite the surge in demand, prices have fallen over 80% since 2023 peak due to oversupply.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Fitch Ratings Revises Metals and Mining Price Assumptions",
    urls: ["https://www.fitchratings.com/metals-mining-price-assumptions-2025/"],
    source: "Fitch Ratings",
    published_at: "2025-10-09T09:00:00Z",
    summary: "Fitch Ratings revised its metals and mining price assumptions for 2025 and beyond. The revision reflects evolving supply-demand dynamics across copper, lithium, nickel and other critical minerals markets.",
    commodities: ["Copper", "Lithium", "Nickel"],
    project_ids: [],
    sentiment: "Neutral"
  },

  // ADDITIONAL LITHIUM NEWS
  {
    title: "Lithium Market Could See Modest Recovery in 2025",
    urls: ["https://www.mining.com/lithium-market-recovery-forecast/"],
    source: "Mining.com",
    published_at: "2025-01-05T08:00:00Z",
    summary: "Adams Intelligence forecasts the lithium market could see a modest recovery in 2025 as supply growth moderates and EV demand stabilizes. However, significant price increases are unlikely given substantial inventory levels in China.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Lithium Mining Industry Poised for Exponential Growth",
    urls: ["https://www.globenewswire.com/lithium-mining-growth-forecast/"],
    source: "GlobeNewswire",
    published_at: "2025-01-06T09:00:00Z",
    summary: "Future Market Insights projects the lithium mining industry is poised for exponential growth amid rising demand for clean energy solutions. The sector faces challenges balancing rapid demand growth with sustainable supply expansion.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Lithium Mining Market Projected to Reach $17B by 2035",
    urls: ["https://investingnews.com/lithium-mining-market-forecast-2035/"],
    source: "Investing News",
    published_at: "2025-10-07T08:00:00Z",
    summary: "The lithium mining market is projected to reach $17 billion by 2035 as it becomes the cornerstone of global energy transition. Growing EV adoption and renewable energy storage drive long-term demand despite current price weakness.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Eramet Delivers First Lithium Carbonate from Argentina DLE Plant",
    urls: ["https://www.mining.com/eramet-centenario-lithium-production/"],
    source: "Mining.com",
    published_at: "2025-01-18T08:00:00Z",
    summary: "Eramet delivered first lithium carbonate from its Centenario direct lithium extraction (DLE) plant in Argentina. The facility represents a new generation of more environmentally friendly lithium production technology.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Pilbara Minerals Terminates Kwinana Phase 2 Expansion",
    urls: ["https://www.mining.com/pilbara-minerals-kwinana-termination/"],
    source: "Mining.com",
    published_at: "2025-01-25T08:30:00Z",
    summary: "Construction work for the Phase 2 expansion at Kwinana was terminated in January 2025 due to the current low-price environment for lithium making it economically unviable. Pilbara focuses on lower-cost spodumene production.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Negative"
  },

  // ADDITIONAL COPPER NEWS
  {
    title: "Global Mine Copper Production to Increase 2.3% in 2025",
    urls: ["https://www.mining.com/global-copper-production-forecast-2025/"],
    source: "Mining.com",
    published_at: "2025-01-30T09:00:00Z",
    summary: "Global mine production is expected to increase by 2.3% to 23.5 million tonnes in 2025. Growth is driven by the ramp-up of Kamoa-Kakula in DRC, Oyu Tolgoi in Mongolia, and commissioning of the Malmyz mine in Russia.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "DRC Copper Production Surges 8% on Kamoa-Kakula Expansion",
    urls: ["https://www.mining.com/drc-copper-production-growth/"],
    source: "Mining.com",
    published_at: "2025-03-10T08:00:00Z",
    summary: "Production in DRC surged by 8 percent, attributable to the expansion of Ivanhoe Mines and Zijin Mining's Kamoa-Kakula joint venture. The country is becoming an increasingly important source of global copper supply.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Arizona Copper Production Projected to Exceed 950,000 MT in 2025",
    urls: ["https://farmonaut.com/arizona-copper-production-2025/"],
    source: "Farmonaut",
    published_at: "2025-02-15T08:00:00Z",
    summary: "Arizona copper production is projected to exceed 950,000 metric tons in 2025, maintaining its rank as the US leader. Multiple operations contribute to the state's dominant position in domestic copper supply.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Chinese Copper Demand Grows 6% in Q1 2025",
    urls: ["https://www.mining.com/china-copper-demand-q1-2025/"],
    source: "Mining.com",
    published_at: "2025-04-15T09:00:00Z",
    summary: "Chinese markets required 6 percent more copper than in 2024 during Q1 2025. The ICSG suggests a 3.3 percent increase in global copper usage, with the largest segment coming from Chinese markets driven by infrastructure and manufacturing.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },

  // INDUSTRY TRENDS AND DEVELOPMENTS
  {
    title: "ASX Lithium Companies to Increase Production 18% in 2025",
    urls: ["https://farmonaut.com/australia-lithium-production-2025/"],
    source: "Farmonaut",
    published_at: "2025-02-01T08:00:00Z",
    summary: "ASX-listed lithium companies in Australia are projected to increase production by 18% in 2025 to meet global battery demand. However, companies face challenging market conditions with lithium prices at multi-year lows.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "ASX Lithium Stocks Experience Volatility on CATL Restart News",
    urls: ["https://www.australianmining.com.au/asx-lithium-volatility-september-2025/"],
    source: "Australian Mining",
    published_at: "2025-09-15T10:00:00Z",
    summary: "ASX lithium stocks experienced substantial one-day declines in September 2025 following news that CATL planned to restart production at its Jianxiawo lithium mine. Liontown Resources dropped 18.4%, Pilbara Minerals fell 17.3%, and IGO declined 14.0%.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "Zambia Copper Output May Rise to Almost 1 Million Tons in 2025",
    urls: ["https://www.mining.com/zambia-copper-output-forecast/"],
    source: "Mining.com",
    published_at: "2025-03-20T08:00:00Z",
    summary: "Zambia says copper output may rise to almost 1 million tons in 2025 as new projects come online and existing operations expand. The country aims to significantly increase its share of global copper production.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Mining M&A Activity Intensifies in 2025 for Critical Minerals",
    urls: ["https://gfmag.com/mining-mergers-acquisitions-2025/"],
    source: "Global Finance Magazine",
    published_at: "2025-04-01T09:00:00Z",
    summary: "Mining M&A activity has intensified in 2025 as major companies seek to secure critical mineral assets for the energy transition. Consolidation among larger and mid-tier producers increases to gain scale and control over supply.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Junior Mining Sector Shows Strong Gold and Battery Metals Activity",
    urls: ["https://www.juniorminingnetwork.com/junior-mining-trends-2025/"],
    source: "Junior Mining Network",
    published_at: "2025-05-15T08:00:00Z",
    summary: "The junior mining sector in 2025 shows distinctive trends with precious metals explorers benefiting from gold's strength above $2,500/oz and battery metals developers continuing to attract investment from electrification trends.",
    commodities: ["Gold", "Lithium", "Copper"],
    project_ids: [],
    sentiment: "Positive"
  },

  // ADDITIONAL COMPANY-SPECIFIC NEWS
  {
    title: "Anglo American Copper Production Forecast 380,000-410,000 Tonnes",
    urls: ["https://www.mining.com/anglo-american-copper-guidance-2025/"],
    source: "Mining.com",
    published_at: "2025-02-20T08:00:00Z",
    summary: "Anglo American produced 466,000 tonnes of copper in 2024 and expects to produce 380,000-410,000 tonnes in 2025. The forecast reflects planned maintenance and optimization activities across its copper portfolio.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Liontown Resources Reports Third Consecutive Positive Cash Flow Quarter",
    urls: ["https://www.ltresources.com.au/june-2025-quarterly/"],
    source: "Liontown Resources",
    published_at: "2025-07-25T08:00:00Z",
    summary: "Liontown Resources achieved record net positive operating cash flows of $23 million in June 2025 quarter, the company's third consecutive quarter of positive operating cash flows. The performance came despite a low-price environment for lithium.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "SQM Cuts Capital Spending to $1.1B Amid Lithium Price Slump",
    urls: ["https://www.mining.com/sqm-cuts-spending-lithium-slump/"],
    source: "Mining.com",
    published_at: "2025-02-15T08:30:00Z",
    summary: "SQM plans to invest $1.1 billion across its businesses in 2025, with $550 million directed toward lithium operations in Chile, representing a reduction from $1.6 billion in 2024 due to the lithium price slump.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "Glencore Metals and Minerals EBIT Increases 26% in H1 2025",
    urls: ["https://www.glencore.com/h1-2025-results/"],
    source: "Glencore",
    published_at: "2025-08-06T08:00:00Z",
    summary: "Glencore's metals and minerals Adjusted EBIT was $1,571 million in H1 2025, an increase of 26% compared to H1 2024. The company benefited from stronger copper and zinc prices during the period.",
    commodities: ["Copper", "Zinc"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Rio Tinto Partners with ENAMI for Chilean Lithium Project",
    urls: ["https://www.mining.com/rio-tinto-enami-lithium-partnership/"],
    source: "Mining.com",
    published_at: "2025-08-15T09:00:00Z",
    summary: "Rio Tinto announced a partnership with Chilean state-owned ENAMI to carry out the lithium project Salares Altoandinos in Atacama Region. The partnership expands Rio Tinto's presence in Chile's lithium sector.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Rio Tinto and Partners Invest $733M in Pilbara Iron Ore Project",
    urls: ["https://www.mining.com/rio-tinto-pilbara-iron-ore-investment/"],
    source: "Mining.com",
    published_at: "2025-06-10T08:00:00Z",
    summary: "Rio Tinto and partners announced a $733 million investment in a Pilbara iron ore project. The investment supports continued production from the world's premier iron ore province in Western Australia.",
    commodities: ["Iron Ore"],
    project_ids: [],
    sentiment: "Positive"
  },

  // FINAL BATCH - DIVERSE NEWS
  {
    title: "Tianqi Lithium Initiates Legal Challenge to Codelco-SQM Deal",
    urls: ["https://www.mining.com/tianqi-codelco-sqm-legal-challenge/"],
    source: "Mining.com",
    published_at: "2025-05-20T09:00:00Z",
    summary: "Tianqi Lithium, SQM's second-largest shareholder, initiated court proceedings against the Codelco-SQM agreement, arguing it lacks transparency and should go to a shareholder vote. The legal challenge creates uncertainty around the partnership.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "Chile's Lower House Symbolically Rejects Codelco-SQM Deal",
    urls: ["https://www.reuters.com/chile-codelco-sqm-rejection/"],
    source: "Reuters",
    published_at: "2025-05-15T08:00:00Z",
    summary: "A symbolic rejection by an investigative commission in Chile's lower house in May 2025 highlighted political controversies around the Codelco-SQM lithium partnership. The non-binding vote reflects opposition concerns about the deal structure.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "Brazil's Serra Verde Reaches Phase 1 Commercial REE Production",
    urls: ["https://investingnews.com/brazil-serra-verde-rare-earths/"],
    source: "Investing News",
    published_at: "2024-01-15T08:00:00Z",
    summary: "Brazil's Serra Verde began Phase 1 commercial production from its Pela Ema rare earths deposit in Goiás state at the top of 2024, with expectations to produce 5,000 MT of rare-earth oxide annually by 2026.",
    commodities: ["Rare Earths"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "China Rare Earth Production Increases to 270,000 MT in 2024",
    urls: ["https://www.usgs.gov/mineral-commodity-summaries-2025/"],
    source: "USGS",
    published_at: "2025-01-20T09:00:00Z",
    summary: "China's domestic output of rare earths was 270,000 metric tons in 2024, up from 255,000 metric tons the previous year. The US produced 45,000 metric tons in 2024, up from 41,600 metric tons in 2023.",
    commodities: ["Rare Earths"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Fastmarkets Projects Lithium Deficit of 1,500 Tonnes in 2026",
    urls: ["https://www.fastmarkets.com/lithium-supply-deficit-forecast/"],
    source: "Fastmarkets",
    published_at: "2025-04-15T08:00:00Z",
    summary: "Fastmarkets projects an oversupply of just 10,000 tonnes in 2025, swinging to a 1,500-tonne deficit in 2026. However, considerable inventory in the supply chain should cushion the market from actual shortages.",
    commodities: ["Lithium"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "J.P. Morgan Projects Copper Prices to Stabilize Around $9,350 in Q4",
    urls: ["https://www.jpmorgan.com/copper-outlook-2025/"],
    source: "J.P. Morgan",
    published_at: "2025-07-01T09:00:00Z",
    summary: "J.P. Morgan projects LME copper prices to slide toward $9,100 per metric tonne in Q3 2025 before stabilizing around $9,350 in Q4. The forecast reflects balanced supply-demand dynamics with modest surplus conditions.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Citigroup Slashes Copper Price Forecast to $8,750/Tonne",
    urls: ["https://www.mining.com/citigroup-copper-forecast-cut/"],
    source: "Mining.com",
    published_at: "2025-06-01T08:00:00Z",
    summary: "Citigroup slashed its copper price expectations to $8,750 per tonne, lower than most competitors. The bank cites concerns about Chinese demand and global economic headwinds affecting industrial metals.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "Morgan Stanley Forecasts Copper Climbing to $9,500 by Year-End",
    urls: ["https://www.mining.com/morgan-stanley-copper-forecast/"],
    source: "Mining.com",
    published_at: "2025-08-15T08:30:00Z",
    summary: "Morgan Stanley forecasts copper prices climbing to $9,500 by year-end 2025, supported by tightening supply conditions and steady demand from electrification and infrastructure projects globally.",
    commodities: ["Copper"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Africa Finance Corporation Backs Kobaloni Cobalt Refinery",
    urls: ["https://www.afc.com/kobaloni-cobalt-investment/"],
    source: "Africa Finance Corporation",
    published_at: "2025-06-15T08:00:00Z",
    summary: "Africa Finance Corporation and Vision Blue provided $100 million backing for Kobaloni Energy's cobalt sulfate refinery. The facility represents a strategic investment in African battery materials processing capacity.",
    commodities: ["Cobalt"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Zambia's Cobalt Production Estimated at 2,500 Tonnes for 2025",
    urls: ["https://www.africanexponent.com/zambia-cobalt-production-2025/"],
    source: "African Exponent",
    published_at: "2025-07-10T09:00:00Z",
    summary: "Zambia's estimated 2025 cobalt production is approximately 2,500 tonnes. The country's cobalt is exclusively a by-product of its massive copper mining industry, with key contributions from Mopani and First Quantum's Kansanshi mine.",
    commodities: ["Cobalt"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Lac Knife Graphite Shows 26% Higher Cathode Density in Battery Test",
    urls: ["https://www.juniorminingnetwork.com/lac-knife-graphite-battery-test/"],
    source: "Junior Mining Network",
    published_at: "2025-06-20T08:00:00Z",
    summary: "Lac Knife graphite demonstrated 26% higher cathode density in battery testing, opening premium market opportunities beyond anodes with zero-waste potential. The results highlight superior technical characteristics for advanced battery applications.",
    commodities: ["Graphite"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Syrah Resources Raises ~A$70M from Equity Offering",
    urls: ["https://www.mining.com/syrah-resources-capital-raise/"],
    source: "Mining.com",
    published_at: "2025-03-10T08:00:00Z",
    summary: "Syrah Resources raised approximately A$70 million from an equity offering to support operations at the Balama graphite mine and fund working capital requirements during the production restart.",
    commodities: ["Graphite"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Graphite One's US Supply Chain Deemed Feasible",
    urls: ["https://www.miningnewsnorth.com/graphite-one-feasibility-study/"],
    source: "North of 60 Mining News",
    published_at: "2025-04-25T09:00:00Z",
    summary: "Graphite One's US supply chain is feasible according to updated engineering studies. The Alaska-based project aims to create a complete domestic graphite supply chain from mining through processing to finished battery materials.",
    commodities: ["Graphite"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Legacy Advances One of Australia's Largest Nickel Deposits",
    urls: ["https://www.australianmining.com.au/legacy-nickel-deposit-advancement/"],
    source: "Australian Mining",
    published_at: "2025-08-10T08:00:00Z",
    summary: "Legacy is advancing one of Australia's largest nickel deposits despite challenging market conditions. The company continues development work positioning the asset for production when nickel prices recover.",
    commodities: ["Nickel"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "Nickel Ore Mining Industry in Australia Valued at $1.4B in 2025",
    urls: ["https://www.ibisworld.com/australia-nickel-ore-mining/"],
    source: "IBISWorld",
    published_at: "2025-03-01T08:00:00Z",
    summary: "The market size of the Nickel Ore Mining industry in Australia is $1.4bn in 2025, with 17 businesses operating in the sector. The industry has declined at a CAGR of 0.0% between 2019 and 2024.",
    commodities: ["Nickel"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "China's Nickel Dominance Raises Supply Chain Security Concerns",
    urls: ["https://investingnews.com/indonesia-nickel-dominance-2025/"],
    source: "Investing News",
    published_at: "2025-05-20T09:00:00Z",
    summary: "By 2035, China is projected to supply roughly 80% of the world's battery-grade nickel through Indonesian operations, highlighting continued Chinese dominance despite Western diversification efforts and raising supply chain security concerns.",
    commodities: ["Nickel"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "Digital Innovation Revolutionizing Africa's Mining Industry",
    urls: ["https://discoveryalert.com.au/africa-mining-digital-transformation/"],
    source: "Discovery Alert",
    published_at: "2025-07-15T08:00:00Z",
    summary: "Digital innovation is revolutionizing Africa's mining industry in 2025 with AI-driven optimization, IoT sensors, and automated systems becoming standard across major operations. The transformation improves efficiency, safety, and environmental performance.",
    commodities: ["All"],
    project_ids: [],
    sentiment: "Positive"
  },
  {
    title: "AMW 2025 to Unpack DRC's Cobalt Market Prospects",
    urls: ["https://energycapitalpower.com/amw-2025-drc-cobalt/"],
    source: "Energy Capital & Power",
    published_at: "2025-08-01T09:00:00Z",
    summary: "African Mining Week 2025 will unpack the DRC's cobalt market prospects and global significance. The DRC accounts for 70% of global cobalt production, making it critical to battery supply chains.",
    commodities: ["Cobalt"],
    project_ids: [],
    sentiment: "Neutral"
  },
  {
    title: "Amnesty International Finds Inadequate Resettlement at Kamoa-Kakula",
    urls: ["https://www.amnesty.org/drc-mining-human-rights/"],
    source: "Amnesty International",
    published_at: "2023-09-15T08:00:00Z",
    summary: "Amnesty International found evidence of inadequate resettlement and forced evictions at industrial cobalt and copper mines in the DRC, including at Kamoa-Kakula. The report highlights ongoing human rights challenges in the sector.",
    commodities: ["Copper", "Cobalt"],
    project_ids: [],
    sentiment: "Negative"
  },
  {
    title: "New Zealand Emerges as Opportunity for Junior Mining Exploration",
    urls: ["https://discoveryalert.com.au/new-zealand-junior-mining-2025/"],
    source: "Discovery Alert",
    published_at: "2025-09-01T08:00:00Z",
    summary: "New Zealand is emerging as a golden opportunity for junior mining exploration with supportive regulations and underexplored geology. The country offers potential for gold, silver, and battery metals discoveries.",
    commodities: ["Gold", "Silver"],
    project_ids: [],
    sentiment: "Positive"
  }
];

async function populateMiningNews() {
  console.log(`Preparing to insert ${miningNewsArticles.length} mining news articles...`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < miningNewsArticles.length; i++) {
    const article = miningNewsArticles[i];

    try {
      const { data, error } = await supabase
        .from('news')
        .insert({
          title: article.title,
          urls: article.urls,
          source: article.source,
          published_at: article.published_at,
          summary: article.summary,
          commodities: article.commodities,
          project_ids: article.project_ids,
          sentiment: article.sentiment,
          watchlist: false
        });

      if (error) {
        console.error(`Error inserting article ${i + 1}: ${article.title}`);
        console.error(error);
        errorCount++;
      } else {
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`Progress: ${successCount} articles inserted...`);
        }
      }
    } catch (err) {
      console.error(`Exception inserting article ${i + 1}: ${article.title}`);
      console.error(err);
      errorCount++;
    }
  }

  console.log('\n=== POPULATION COMPLETE ===');
  console.log(`Total articles processed: ${miningNewsArticles.length}`);
  console.log(`Successfully inserted: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  // Print summary statistics
  const commodityCounts: Record<string, number> = {};
  const sentimentCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};

  miningNewsArticles.forEach(article => {
    article.commodities.forEach(commodity => {
      commodityCounts[commodity] = (commodityCounts[commodity] || 0) + 1;
    });
    sentimentCounts[article.sentiment] = (sentimentCounts[article.sentiment] || 0) + 1;
    sourceCounts[article.source] = (sourceCounts[article.source] || 0) + 1;
  });

  console.log('\n=== BREAKDOWN BY COMMODITY ===');
  Object.entries(commodityCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([commodity, count]) => {
      console.log(`${commodity}: ${count} articles`);
    });

  console.log('\n=== BREAKDOWN BY SENTIMENT ===');
  Object.entries(sentimentCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([sentiment, count]) => {
      console.log(`${sentiment}: ${count} articles`);
    });

  console.log('\n=== BREAKDOWN BY SOURCE ===');
  Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`${source}: ${count} articles`);
    });
}

populateMiningNews().catch(console.error);
