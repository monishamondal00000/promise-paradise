// One-off migration to add `subPlaces` (specific venues / grounds) to destinations.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'data', 'destinations.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));

// Curated, real-world wedding venues per destination
const venueMap = {
  'dest-1': [ // Udaipur
    { name: 'Taj Lake Palace', type: 'Palace Hotel', capacity: 250, description: 'Iconic 18th-century floating palace on Lake Pichola' },
    { name: 'The Oberoi Udaivilas', type: 'Luxury Resort', capacity: 400, description: 'Mughal-inspired palace resort on the lake' },
    { name: 'Jagmandir Island Palace', type: 'Heritage Palace', capacity: 600, description: 'Private island palace for grand celebrations' },
    { name: 'Fateh Garh Palace', type: 'Hilltop Palace', capacity: 350, description: 'Restored 17th-century palace with Aravalli views' }
  ],
  'dest-2': [ // Jaipur
    { name: 'Rambagh Palace', type: 'Palace Hotel', capacity: 500, description: 'Former Maharaja residence with regal lawns' },
    { name: 'Samode Palace', type: 'Heritage Palace', capacity: 400, description: '475-year-old palace with mirror-work halls' },
    { name: 'Jai Mahal Palace', type: 'Garden Palace', capacity: 600, description: 'Indo-Saracenic palace with 18-acre gardens' },
    { name: 'Chomu Palace', type: 'Fort Hotel', capacity: 500, description: '300-year-old painted fort just outside Jaipur' }
  ],
  'dest-3': [ // Jodhpur
    { name: 'Umaid Bhawan Palace', type: 'Royal Palace', capacity: 500, description: 'One of the world\'s largest private residences' },
    { name: 'Mehrangarh Fort', type: 'Fort Venue', capacity: 800, description: 'Towering 15th-century fort with city views' },
    { name: 'RAAS Jodhpur', type: 'Boutique Heritage', capacity: 200, description: 'Award-winning heritage hotel inside the Old City' }
  ],
  'dest-4': [ // North Goa
    { name: 'Taj Fort Aguada', type: 'Beach Resort', capacity: 400, description: 'Cliff-top resort with private beach' },
    { name: 'W Goa, Vagator', type: 'Lifestyle Resort', capacity: 350, description: 'Vibrant cliff-side resort over Vagator Beach' },
    { name: 'Sereno Beach Club, Morjim', type: 'Beach Club', capacity: 250, description: 'Chic beach club for sunset ceremonies' }
  ],
  'dest-5': [ // South Goa
    { name: 'The Leela Goa', type: 'Beach Resort', capacity: 500, description: 'Lagoon-front Portuguese-style resort' },
    { name: 'Taj Exotica, Benaulim', type: 'Beach Resort', capacity: 400, description: 'Mediterranean villa-style beach resort' },
    { name: 'Park Hyatt Goa, Cansaulim', type: 'Beach Resort', capacity: 450, description: 'Indo-Portuguese resort on Arossim Beach' }
  ],
  'dest-6': [ // Kerala Backwaters
    { name: 'Kumarakom Lake Resort', type: 'Backwater Resort', capacity: 300, description: 'Traditional Kerala villas on Vembanad Lake' },
    { name: 'Taj Kumarakom', type: 'Heritage Resort', capacity: 200, description: 'Restored colonial bungalow on backwaters' },
    { name: 'Coconut Lagoon, Alleppey', type: 'Houseboat Stay', capacity: 150, description: 'Heritage Tharavadu mansions and houseboats' }
  ],
  'dest-7': [ // Coorg
    { name: 'Tamara Coorg', type: 'Plantation Resort', capacity: 200, description: 'Eco-luxury cottages in 180 acres of coffee estate' },
    { name: 'Taj Madikeri Resort & Spa', type: 'Forest Resort', capacity: 300, description: 'Rainforest resort with panoramic valley views' },
    { name: 'Evolve Back Coorg', type: 'Plantation Resort', capacity: 250, description: 'Heritage colonial bungalow-style resort' }
  ],
  'dest-8': [ // Rishikesh
    { name: 'Ananda in the Himalayas', type: 'Spa Resort', capacity: 200, description: '100-acre Maharaja\'s palace estate resort' },
    { name: 'Aloha on the Ganges', type: 'Riverside Resort', capacity: 250, description: 'Beachfront resort on the Ganges' },
    { name: 'Atali Ganga', type: 'Adventure Resort', capacity: 150, description: 'Cliffside cottages overlooking river rapids' }
  ],
  'dest-9': [ // Shimla
    { name: 'Wildflower Hall', type: 'Mountain Palace', capacity: 200, description: 'Former Lord Kitchener residence in deodar forest' },
    { name: 'The Oberoi Cecil', type: 'Colonial Hotel', capacity: 180, description: 'Heritage hotel since 1884 on the Mall' },
    { name: 'Mashobra Greens', type: 'Mountain Resort', capacity: 250, description: 'Apple orchard resort 13km from Shimla' }
  ],
  'dest-10': [ // Darjeeling
    { name: 'Mayfair Darjeeling', type: 'Heritage Hotel', capacity: 200, description: 'Former Maharaja of Nazargunj summer palace' },
    { name: 'Glenburn Tea Estate', type: 'Tea Estate Bungalow', capacity: 80, description: 'Boutique heritage planter\'s bungalow' },
    { name: 'Windamere Hotel', type: 'Colonial Hotel', capacity: 120, description: 'Raj-era hotel atop Observatory Hill' }
  ],
  'dest-11': [ // Mahabalipuram
    { name: 'InterContinental Chennai Mahabalipuram', type: 'Beach Resort', capacity: 400, description: 'Cliffside resort overlooking Bay of Bengal' },
    { name: 'Radisson Blu Temple Bay', type: 'Beach Resort', capacity: 350, description: 'Beachfront resort near Shore Temple' },
    { name: 'Ideal Beach Resort', type: 'Beach Resort', capacity: 250, description: 'Heritage beach resort with traditional cottages' }
  ],
  'dest-12': [ // Andaman
    { name: 'Taj Exotica Andamans, Havelock', type: 'Beach Resort', capacity: 200, description: 'Sustainable beachfront retreat on Radhanagar' },
    { name: 'Barefoot at Havelock', type: 'Eco Resort', capacity: 120, description: 'Beachside cottages near Radhanagar Beach' },
    { name: 'SeaShell Havelock', type: 'Island Resort', capacity: 250, description: 'Tropical resort steps from the beach' }
  ],
  'dest-13': [ // Bali
    { name: 'Alila Villas Uluwatu', type: 'Cliffside Villa', capacity: 200, description: 'Architectural villas on Bukit clifftop' },
    { name: 'Four Seasons Sayan, Ubud', type: 'Jungle Resort', capacity: 250, description: 'Lotus-pond resort in Ayung river valley' },
    { name: 'Bvlgari Resort Bali', type: 'Cliffside Resort', capacity: 180, description: 'Ultra-luxury Uluwatu cliff villas' },
    { name: 'Tirtha Uluwatu', type: 'Wedding Chapel', capacity: 300, description: 'Glass chapel suspended over the Indian Ocean' }
  ],
  'dest-14': [ // Santorini
    { name: 'Canaves Oia Suites', type: 'Caldera Hotel', capacity: 150, description: 'Cave-style suites with caldera views' },
    { name: 'Santo Maris Oia', type: 'Luxury Suites', capacity: 200, description: 'Cycladic-style hilltop hotel' },
    { name: 'Le Ciel Santorini', type: 'Wedding Venue', capacity: 250, description: 'Open-air clifftop wedding venue' },
    { name: 'Dana Villas', type: 'Boutique Villas', capacity: 120, description: 'Whitewashed villas overlooking the caldera' }
  ],
  'dest-15': [ // Maldives
    { name: 'Soneva Jani', type: 'Overwater Resort', capacity: 100, description: 'Private island with overwater villas and retractable roof' },
    { name: 'Conrad Maldives Rangali', type: 'Twin Island Resort', capacity: 200, description: 'Underwater restaurant and overwater pavilions' },
    { name: 'Cheval Blanc Randheli', type: 'Private Island', capacity: 150, description: 'Ultra-luxury LVMH-operated island' },
    { name: 'Velaa Private Island', type: 'Private Island', capacity: 180, description: 'Exclusive Noonu Atoll private island' }
  ],
  'dest-16': [ // Dubai
    { name: 'Burj Al Arab Jumeirah', type: 'Luxury Hotel', capacity: 400, description: 'Iconic sail-shaped 7-star hotel' },
    { name: 'Atlantis The Palm', type: 'Resort Palace', capacity: 600, description: 'Aquaventure resort on Palm Jumeirah crescent' },
    { name: 'Bab Al Shams Desert Resort', type: 'Desert Resort', capacity: 350, description: 'Arabian fort-style desert resort' },
    { name: 'Armani Hotel Dubai', type: 'Luxury Hotel', capacity: 300, description: 'Inside Burj Khalifa with skyline views' }
  ],
  'dest-17': [ // Paris
    { name: 'Château de Chantilly', type: 'Royal Château', capacity: 300, description: 'Renaissance château with formal gardens' },
    { name: 'Shangri-La Hotel Paris', type: 'Palace Hotel', capacity: 250, description: 'Former Bonaparte residence with Eiffel views' },
    { name: 'Le Pavillon Ledoyen', type: 'Garden Pavilion', capacity: 200, description: '18th-century pavilion in Champs-Élysées gardens' },
    { name: 'Château de Vaux-le-Vicomte', type: 'Historic Château', capacity: 400, description: 'Baroque château that inspired Versailles' }
  ],
  'dest-18': [ // Tuscany
    { name: 'Castello di Vincigliata', type: 'Medieval Castle', capacity: 250, description: 'Restored castle in Florentine hills' },
    { name: 'Villa Cetinale', type: 'Baroque Villa', capacity: 200, description: '17th-century villa near Siena' },
    { name: 'Borgo San Felice', type: 'Tuscan Hamlet', capacity: 180, description: '13th-century hamlet in Chianti' },
    { name: 'Villa di Geggiano', type: 'Heritage Villa', capacity: 150, description: 'UNESCO-listed villa with frescoed halls' }
  ],
  'dest-19': [ // Phuket
    { name: 'Sri Panwa Phuket', type: 'Cliffside Resort', capacity: 250, description: 'Headland resort with private villas' },
    { name: 'Trisara Phuket', type: 'Beach Resort', capacity: 200, description: 'Private bay villas on Andaman Sea' },
    { name: 'Anantara Layan Phuket', type: 'Beach Resort', capacity: 300, description: 'Hillside and beachfront pool villas' }
  ],
  'dest-20': [ // Galle
    { name: 'Amangalla', type: 'Heritage Hotel', capacity: 120, description: 'Restored 17th-century Dutch hotel inside Galle Fort' },
    { name: 'Cape Weligama', type: 'Cliffside Resort', capacity: 200, description: 'Crescent-shaped headland resort' },
    { name: 'Anantara Peace Haven Tangalle', type: 'Beach Resort', capacity: 280, description: 'Cliff-top resort above golden beach' }
  ],
  'dest-21': [ // Mussoorie
    { name: 'JW Marriott Mussoorie Walnut Grove', type: 'Mountain Resort', capacity: 350, description: 'Luxury resort with Himalayan views' },
    { name: 'The Savoy Mussoorie', type: 'Colonial Hotel', capacity: 250, description: 'Restored 1902 British-era hotel' },
    { name: 'Jaypee Residency Manor', type: 'Hill Resort', capacity: 300, description: 'Castle-style hotel with panoramic views' }
  ],
  'dest-22': [ // Jaisalmer
    { name: 'Suryagarh Jaisalmer', type: 'Desert Palace', capacity: 400, description: 'Sandstone fortress-style hotel on Thar edge' },
    { name: 'The Serai, Jaisalmer', type: 'Luxury Tented Camp', capacity: 250, description: 'Mughal-inspired luxury desert camp' },
    { name: 'Manvar Desert Camp', type: 'Tented Camp', capacity: 200, description: 'Sand-dune camp with cultural evenings' }
  ],
  'dest-23': [ // Agra
    { name: 'The Oberoi Amarvilas', type: 'Luxury Hotel', capacity: 300, description: 'Every room with Taj Mahal view' },
    { name: 'ITC Mughal Agra', type: 'Palace Hotel', capacity: 500, description: 'Mughal-style courtyard hotel with 35-acre gardens' },
    { name: 'Jaypee Palace Hotel', type: 'Palace Hotel', capacity: 600, description: 'Marble-and-sandstone palace-style hotel' }
  ],
  'dest-24': [ // Nainital
    { name: 'The Naini Retreat', type: 'Heritage Hotel', capacity: 200, description: 'Former Maharaja of Pilibhit summer estate' },
    { name: 'Vikram Vintage Inn', type: 'Boutique Hotel', capacity: 150, description: 'Lake-view colonial-style hotel' },
    { name: 'Aamod Resort, Bhimtal', type: 'Lake Resort', capacity: 200, description: 'Private cottages on Bhimtal Lake' }
  ],
  'dest-25': [ // Ooty
    { name: 'Taj Savoy Ootacamund', type: 'Heritage Hotel', capacity: 250, description: 'Restored 19th-century British cottage hotel' },
    { name: 'Fernhills Royale Palace', type: 'Palace Hotel', capacity: 200, description: 'Former Mysore royal family summer palace' },
    { name: 'King\'s Cliff Ooty', type: 'Boutique Hotel', capacity: 100, description: 'Colonial-era heritage boutique stay' }
  ],
  'dest-26': [ // Varanasi
    { name: 'Taj Ganges, Varanasi', type: 'Luxury Hotel', capacity: 300, description: '40-acre palatial hotel near the ghats' },
    { name: 'BrijRama Palace', type: 'Heritage Palace', capacity: 200, description: '18th-century palace on Darbhanga Ghat' },
    { name: 'Hotel Clarks Varanasi', type: 'Heritage Hotel', capacity: 250, description: 'Long-standing luxury hotel' }
  ],
  'dest-27': [ // Munnar
    { name: 'The Tall Trees Resort', type: 'Forest Resort', capacity: 200, description: '66-acre rainforest resort' },
    { name: 'Windermere Estate', type: 'Plantation Bungalow', capacity: 120, description: 'Boutique stay amid cardamom estate' },
    { name: 'Fragrant Nature Munnar', type: 'Hill Resort', capacity: 250, description: 'Five-star resort with valley views' }
  ],
  'dest-28': [ // Pushkar
    { name: 'Ananta Spa & Resort, Pushkar', type: 'Spa Resort', capacity: 350, description: 'Sprawling lakeside spa resort' },
    { name: 'The Westin Pushkar Resort & Spa', type: 'Luxury Resort', capacity: 400, description: 'Aravalli-hills luxury resort' },
    { name: 'Pushkar Bagh Resort', type: 'Heritage Resort', capacity: 250, description: 'Rajasthani-themed resort with courtyards' }
  ],
  'dest-29': [ // Lonavala
    { name: 'Hilton Shillim Estate Retreat & Spa', type: 'Wellness Retreat', capacity: 200, description: '320-acre Sahyadri valley resort' },
    { name: 'Della Resorts', type: 'Adventure Resort', capacity: 500, description: 'Adventure-themed resort with multiple venues' },
    { name: 'Fariyas Resort Lonavala', type: 'Hill Resort', capacity: 300, description: 'Long-standing valley-view resort' }
  ],
  'dest-30': [ // Pondicherry
    { name: 'Le Pondy', type: 'Beach Resort', capacity: 300, description: 'French-colonial beach resort on Bay of Bengal' },
    { name: 'Villa Shanti', type: 'Heritage Hotel', capacity: 100, description: 'Restored French Quarter villa' },
    { name: 'Promenade Hotel', type: 'Sea-front Hotel', capacity: 200, description: 'Boutique hotel on Goubert Avenue' }
  ],
  'dest-31': [ // Mount Abu
    { name: 'The Jaipur House', type: 'Heritage Hotel', capacity: 150, description: 'Former Jaipur royal summer palace' },
    { name: 'Cama Rajputana Club Resort', type: 'Colonial Resort', capacity: 200, description: '1895-built club resort' },
    { name: 'Hotel Hilltone', type: 'Hill Resort', capacity: 250, description: 'Lake-side resort near Nakki' }
  ],
  'dest-32': [ // Rann of Kutch
    { name: 'Rann Utsav Tent City', type: 'Luxury Tent City', capacity: 1000, description: 'Seasonal premium tent city on the white desert' },
    { name: 'The Fern Gir Forest Resort', type: 'Resort', capacity: 300, description: 'Eco-resort near the salt desert' },
    { name: 'Infinity Rann of Kutch Resort', type: 'Desert Resort', capacity: 250, description: 'Bhunga-style luxury resort' }
  ],
  'dest-33': [ // Lakshadweep
    { name: 'Bangaram Island Resort', type: 'Island Resort', capacity: 100, description: 'Coconut-fringed coral atoll resort' },
    { name: 'Agatti Island Beach Resort', type: 'Island Resort', capacity: 80, description: 'Lagoon-side cottages on Agatti' }
  ],
  'dest-34': [ // Manali
    { name: 'The Himalayan, Manali', type: 'Castle Hotel', capacity: 250, description: 'Gothic-style castle in pine forest' },
    { name: 'Span Resort & Spa', type: 'River Resort', capacity: 300, description: 'Beas-river-side luxury resort' },
    { name: 'Solang Valley Resort', type: 'Mountain Resort', capacity: 200, description: 'Snow-capped valley-view resort' }
  ],
  'dest-35': [ // Mysore
    { name: 'Radisson Blu Plaza Mysore', type: 'Luxury Hotel', capacity: 500, description: 'Grand banquet hotel near city centre' },
    { name: 'Royal Orchid Metropole', type: 'Heritage Hotel', capacity: 250, description: '1920s heritage hotel of Wadiyar royals' },
    { name: 'Lalitha Mahal Palace', type: 'Palace Hotel', capacity: 400, description: 'Second-largest palace of Mysore royals' }
  ],
  'dest-36': [ // Auli
    { name: 'The Cliff Top Club', type: 'Ski Resort', capacity: 150, description: 'Ski-in / ski-out alpine resort' },
    { name: 'Auli D Resort', type: 'Mountain Resort', capacity: 200, description: 'Panoramic Nanda Devi-view resort' }
  ],
  'dest-37': [ // Kumbhalgarh
    { name: 'The Aodhi by HRH Group', type: 'Heritage Hotel', capacity: 250, description: 'Hunting-lodge-style heritage hotel' },
    { name: 'Club Mahindra Fort Kumbhalgarh', type: 'Fort Resort', capacity: 300, description: 'Fort-themed resort with Aravalli views' },
    { name: 'Ramada Resort Kumbhalgarh', type: 'Resort', capacity: 350, description: 'Modern resort near the Great Wall fort' }
  ],
  'dest-38': [ // Hampi
    { name: 'Evolve Back Kamalapura Palace', type: 'Palace Hotel', capacity: 200, description: 'Vijayanagara-style luxury resort' },
    { name: 'Hyatt Place Hampi', type: 'Resort', capacity: 250, description: 'Riverside contemporary resort' }
  ],
  'dest-39': [ // Amritsar
    { name: 'Taj Swarna, Amritsar', type: 'Luxury Hotel', capacity: 500, description: 'Punjab-themed luxury hotel' },
    { name: 'Hyatt Regency Amritsar', type: 'Luxury Hotel', capacity: 600, description: 'City hotel with grand ballrooms' },
    { name: 'Ramada Amritsar', type: 'Banquet Hotel', capacity: 400, description: 'Lavish North-Indian banquet venue' }
  ],
  'dest-40': [ // Chandigarh
    { name: 'JW Marriott Chandigarh', type: 'Luxury Hotel', capacity: 500, description: 'Grand banquet halls in Sector 35' },
    { name: 'Taj Chandigarh', type: 'Luxury Hotel', capacity: 400, description: 'Central business-district hotel' },
    { name: 'The Lalit Chandigarh', type: 'Luxury Hotel', capacity: 600, description: 'Modern hotel with multiple ballrooms' }
  ],
  'dest-41': [ // Zanzibar
    { name: 'The Residence Zanzibar', type: 'Beach Villa Resort', capacity: 200, description: 'Private-pool villas on Kizimkazi beach' },
    { name: 'Park Hyatt Zanzibar', type: 'Stone Town Hotel', capacity: 250, description: 'Sea-front heritage hotel in Stone Town' },
    { name: 'Zuri Zanzibar', type: 'Beach Resort', capacity: 180, description: 'Eco-luxe resort on Kendwa beach' }
  ],
  'dest-42': [ // Amalfi Coast
    { name: 'Belmond Hotel Caruso, Ravello', type: 'Cliffside Hotel', capacity: 200, description: '11th-century palazzo above the coast' },
    { name: 'Il San Pietro di Positano', type: 'Cliffside Hotel', capacity: 150, description: 'Vertical garden-cliff hotel in Positano' },
    { name: 'Villa Cimbrone, Ravello', type: 'Historic Villa', capacity: 250, description: 'Famous "Terrace of Infinity" venue' }
  ],
  'dest-43': [ // Cancun
    { name: 'Nizuc Resort & Spa', type: 'Beach Resort', capacity: 350, description: 'Mayan-inspired beachfront resort' },
    { name: 'Rosewood Mayakoba', type: 'Lagoon Resort', capacity: 300, description: 'Lagoon-suite resort on Riviera Maya' },
    { name: 'Banyan Tree Mayakoba', type: 'Beach Resort', capacity: 250, description: 'Asian-style villas in mangrove channels' }
  ],
  'dest-44': [ // Cape Town
    { name: 'Cape Grace Hotel', type: 'Waterfront Hotel', capacity: 250, description: 'V&A Waterfront five-star hotel' },
    { name: 'Mont Rochelle, Franschhoek', type: 'Vineyard Hotel', capacity: 200, description: 'Richard Branson\'s wine-country retreat' },
    { name: 'Ellerman House', type: 'Boutique Hotel', capacity: 80, description: 'Bantry Bay Cape Dutch mansion' }
  ],
  'dest-45': [ // Halong Bay
    { name: 'Paradise Elegance Cruise', type: 'Luxury Cruise', capacity: 100, description: 'Five-star private wedding cruise' },
    { name: 'Vinpearl Resort Halong', type: 'Island Resort', capacity: 300, description: 'Reu-island luxury resort' }
  ],
  'dest-46': [ // Marrakech
    { name: 'La Mamounia', type: 'Historic Palace Hotel', capacity: 300, description: 'Iconic 1923 palace hotel with Andalusian gardens' },
    { name: 'Royal Mansour Marrakech', type: 'Riad Hotel', capacity: 200, description: 'Private-riad palace built by King Mohammed VI' },
    { name: 'Selman Marrakech', type: 'Resort', capacity: 350, description: 'Moorish resort with reflecting pools and Arabian stables' }
  ],
  'dest-47': [ // Swiss Alps
    { name: 'Victoria Jungfrau Grand Hotel & Spa', type: 'Palace Hotel', capacity: 250, description: 'Belle-Époque hotel in Interlaken' },
    { name: 'Burgenstock Resort', type: 'Mountain Resort', capacity: 300, description: 'Cliff-top resort above Lake Lucerne' },
    { name: 'The Chedi Andermatt', type: 'Alpine Resort', capacity: 200, description: 'Asian-Alpine fusion luxury resort' }
  ],
  'dest-48': [ // Fiji
    { name: 'Laucala Island Resort', type: 'Private Island', capacity: 80, description: 'Ultra-private 12-square-mile island' },
    { name: 'Six Senses Fiji', type: 'Island Resort', capacity: 150, description: 'Solar-powered eco resort on Malolo Island' },
    { name: 'Likuliku Lagoon Resort', type: 'Overwater Resort', capacity: 100, description: 'Fiji\'s only overwater bures' }
  ],
  'dest-49': [ // Prague
    { name: 'Chateau Mcely', type: 'Baroque Château', capacity: 250, description: 'Forest-surrounded fairytale château' },
    { name: 'Hotel U Prince', type: 'Old Town Hotel', capacity: 150, description: 'Old Town Square hotel with castle views' },
    { name: 'Aria Hotel Prague', type: 'Boutique Hotel', capacity: 120, description: 'Music-themed luxury hotel near Charles Bridge' }
  ],
  'dest-50': [ // Seychelles
    { name: 'Six Senses Zil Pasyon', type: 'Private Island', capacity: 150, description: 'Granite-boulder villas on Felicite Island' },
    { name: 'Four Seasons Resort Seychelles', type: 'Cliffside Resort', capacity: 200, description: 'Hilltop villas overlooking Petite Anse' },
    { name: 'North Island Lodge', type: 'Private Island', capacity: 80, description: 'Ultra-exclusive 11-villa private island' }
  ]
};

let added = 0;
for (const dest of data) {
  if (venueMap[dest.id]) {
    dest.subPlaces = venueMap[dest.id];
    added++;
  } else if (!dest.subPlaces) {
    dest.subPlaces = [];
  }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Updated ${added}/${data.length} destinations with subPlaces`);
