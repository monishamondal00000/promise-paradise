import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let content = fs.readFileSync(join(__dirname, '../data/destinations.json'), 'utf8');
content = content.replace(/^\uFEFF/, '');
const destinations = JSON.parse(content);

// Transportation data for each destination
const transportData = {
  'dest-1': { nearestAirport: 'Maharana Pratap Airport (UDR)', airportDistance: '22 km', railwayStation: 'Udaipur City Railway Station', railwayDistance: '4 km', transportModes: ['Taxi', 'Auto-rickshaw', 'Hotel shuttle'] },
  'dest-2': { nearestAirport: 'Jaipur International Airport (JAI)', airportDistance: '12 km', railwayStation: 'Jaipur Junction', railwayDistance: '5 km', transportModes: ['Taxi', 'Metro', 'Auto-rickshaw'] },
  'dest-3': { nearestAirport: 'Jodhpur Airport (JDH)', airportDistance: '5 km', railwayStation: 'Jodhpur Junction', railwayDistance: '3 km', transportModes: ['Taxi', 'Auto-rickshaw', 'Hotel pickup'] },
  'dest-4': { nearestAirport: 'Goa International Airport (GOI)', airportDistance: '30 km', railwayStation: 'Madgaon Railway Station', railwayDistance: '15 km', transportModes: ['Taxi', 'Rental car', 'Hotel shuttle'] },
  'dest-5': { nearestAirport: 'Kempegowda International Airport (BLR)', airportDistance: '40 km', railwayStation: 'Bangalore City Junction', railwayDistance: '5 km', transportModes: ['Taxi', 'Metro', 'Bus'] },
  'dest-6': { nearestAirport: 'Cochin International Airport (COK)', airportDistance: '35 km', railwayStation: 'Alappuzha Railway Station', railwayDistance: '10 km', transportModes: ['Taxi', 'Houseboat transfer', 'Auto-rickshaw'] },
  'dest-7': { nearestAirport: 'Mangalore International Airport (IXE)', airportDistance: '160 km', railwayStation: 'Mysore Junction', railwayDistance: '120 km', transportModes: ['Taxi', 'Private car', 'Resort pickup'] },
  'dest-8': { nearestAirport: 'Chhatrapati Shivaji Airport (BOM)', airportDistance: '10 km', railwayStation: 'Mumbai Central', railwayDistance: '5 km', transportModes: ['Taxi', 'Local train', 'Metro', 'Auto-rickshaw'] },
  'dest-9': { nearestAirport: 'Shimla Airport (SLV)', airportDistance: '23 km', railwayStation: 'Shimla Railway Station', railwayDistance: '2 km', transportModes: ['Taxi', 'Toy train', 'Hotel pickup'] },
  'dest-10': { nearestAirport: 'Hyderabad Airport (HYD)', airportDistance: '25 km', railwayStation: 'Secunderabad Junction', railwayDistance: '10 km', transportModes: ['Taxi', 'Metro', 'Auto-rickshaw'] },
  'dest-11': { nearestAirport: 'Kolkata Airport (CCU)', airportDistance: '17 km', railwayStation: 'Howrah Junction', railwayDistance: '8 km', transportModes: ['Taxi', 'Metro', 'Auto-rickshaw'] },
  'dest-12': { nearestAirport: 'Veer Savarkar Airport (IXZ)', airportDistance: '4 km', railwayStation: 'N/A (No railway)', railwayDistance: 'N/A', transportModes: ['Taxi', 'Ferry', 'Resort shuttle'] },
  'dest-13': { nearestAirport: 'Ngurah Rai International Airport (DPS)', airportDistance: '15 km', railwayStation: 'N/A (No railway)', railwayDistance: 'N/A', transportModes: ['Private car', 'Hotel shuttle', 'Taxi'] },
  'dest-14': { nearestAirport: 'Santorini Airport (JTR)', airportDistance: '8 km', railwayStation: 'N/A (No railway)', railwayDistance: 'N/A', transportModes: ['Taxi', 'Hotel transfer', 'Private van'] },
  'dest-15': { nearestAirport: 'Velana International Airport (MLE)', airportDistance: '5 km', railwayStation: 'N/A (No railway)', railwayDistance: 'N/A', transportModes: ['Speedboat', 'Seaplane', 'Resort boat'] },
  'dest-16': { nearestAirport: 'Dubai International Airport (DXB)', airportDistance: '10 km', railwayStation: 'N/A', railwayDistance: 'N/A', transportModes: ['Taxi', 'Metro', 'Hotel limousine'] },
  'dest-17': { nearestAirport: 'Charles de Gaulle Airport (CDG)', airportDistance: '30 km', railwayStation: 'Gare du Nord', railwayDistance: '5 km', transportModes: ['Taxi', 'Metro', 'Private car'] },
  'dest-18': { nearestAirport: 'Florence Airport (FLR)', airportDistance: '80 km', railwayStation: 'Firenze SMN', railwayDistance: '70 km', transportModes: ['Private car', 'Rental car', 'Villa shuttle'] },
  'dest-19': { nearestAirport: 'Phuket International Airport (HKT)', airportDistance: '35 km', railwayStation: 'N/A (No railway)', railwayDistance: 'N/A', transportModes: ['Taxi', 'Minivan', 'Hotel shuttle'] },
  'dest-20': { nearestAirport: 'Chennai International Airport (MAA)', airportDistance: '60 km', railwayStation: 'Mahabalipuram Road Station', railwayDistance: '2 km', transportModes: ['Taxi', 'Bus', 'Auto-rickshaw'] },
  'dest-21': { nearestAirport: 'Dehradun Airport (DED)', airportDistance: '25 km', railwayStation: 'Dehradun Railway Station', railwayDistance: '20 km', transportModes: ['Taxi', 'Private car', 'Resort pickup'] },
  'dest-22': { nearestAirport: 'Jaisalmer Airport (JSA)', airportDistance: '15 km', railwayStation: 'Jaisalmer Railway Station', railwayDistance: '2 km', transportModes: ['Taxi', 'Jeep', 'Camel cart (ceremonial)'] },
  'dest-23': { nearestAirport: 'Cochin International Airport (COK)', airportDistance: '80 km', railwayStation: 'Kottayam Railway Station', railwayDistance: '15 km', transportModes: ['Taxi', 'Private car', 'Resort shuttle'] },
  'dest-24': { nearestAirport: 'Dabolim Airport (GOI)', airportDistance: '70 km', railwayStation: 'Sawantwadi Road Station', railwayDistance: '30 km', transportModes: ['Taxi', 'Private car'] },
  'dest-25': { nearestAirport: 'Coimbatore Airport (CJB)', airportDistance: '88 km', railwayStation: 'Ooty Railway Station', railwayDistance: '2 km', transportModes: ['Taxi', 'Toy train', 'Hotel pickup'] },
  'dest-26': { nearestAirport: 'Lal Bahadur Shastri Airport (VNS)', airportDistance: '26 km', railwayStation: 'Varanasi Junction', railwayDistance: '3 km', transportModes: ['Taxi', 'Auto-rickshaw', 'E-rickshaw'] },
  'dest-27': { nearestAirport: 'Cochin International Airport (COK)', airportDistance: '45 km', railwayStation: 'Ernakulam Junction', railwayDistance: '10 km', transportModes: ['Taxi', 'Auto-rickshaw', 'Hotel shuttle'] },
  'dest-28': { nearestAirport: 'Bagdogra Airport (IXB)', airportDistance: '124 km', railwayStation: 'New Jalpaiguri (NJP)', railwayDistance: '88 km', transportModes: ['Taxi', 'Shared jeep', 'Toy train'] },
  'dest-29': { nearestAirport: 'Madurai Airport (IXM)', airportDistance: '12 km', railwayStation: 'Madurai Junction', railwayDistance: '5 km', transportModes: ['Taxi', 'Auto-rickshaw', 'Bus'] },
  'dest-30': { nearestAirport: 'Devi Ahilya Bai Airport (IDR)', airportDistance: '10 km', railwayStation: 'Indore Junction', railwayDistance: '5 km', transportModes: ['Taxi', 'Auto-rickshaw'] },
};

// Reviews for venues (sample reviews for all sub-places)
const reviewTemplates = [
  { reviewer: 'Priya & Arjun', rating: 5, text: 'Absolutely magical venue! The staff went above and beyond to make our special day perfect. The views were breathtaking and our guests are still talking about it.', date: '2025-11' },
  { reviewer: 'Sneha & Rahul', rating: 4, text: 'Beautiful location with excellent hospitality. The food was outstanding and the decor options were endless. Minor coordination issues but overall wonderful.', date: '2025-09' },
  { reviewer: 'Ananya & Vikram', rating: 5, text: 'Dream wedding come true! Every detail was taken care of. The venue ambiance during sunset was unreal. Highly recommend for anyone looking for a royal celebration.', date: '2025-12' },
  { reviewer: 'Meera & Karan', rating: 4, text: 'Great experience overall. The venue is well-maintained and photogenic from every angle. Our photographer loved the natural backdrops. Would definitely recommend.', date: '2025-08' },
  { reviewer: 'Ritu & Aditya', rating: 5, text: 'Nothing short of spectacular! The management was professional, accommodating all our requests. The bridal suite was gorgeous and the ceremony area was like a fairy tale.', date: '2026-01' },
  { reviewer: 'Kavya & Rohan', rating: 4, text: 'Lovely venue with rich history and charm. Our guests were impressed by the architecture and service. The food quality was excellent with diverse cuisine options.', date: '2025-10' },
  { reviewer: 'Nisha & Amit', rating: 5, text: 'Perfect in every way! We had a 3-day celebration and everything was seamless. The coordination team was exceptional and very responsive to last-minute changes.', date: '2026-02' },
  { reviewer: 'Pooja & Sameer', rating: 4, text: 'Wonderful venue for a destination wedding. The rooms were comfortable, the food was delicious, and the decorations looked stunning. A few logistic hiccups but nothing major.', date: '2025-07' },
];

destinations.forEach(dest => {
  // Add transportation info
  const transport = transportData[dest.id];
  if (transport) {
    dest.transportation = transport;
  } else {
    // Default for unlisted destinations
    dest.transportation = {
      nearestAirport: 'Local Airport',
      airportDistance: '20 km',
      railwayStation: 'Nearest Railway Station',
      railwayDistance: '10 km',
      transportModes: ['Taxi', 'Auto-rickshaw', 'Hotel pickup']
    };
  }

  // Add reviews to each sub-place
  if (dest.subPlaces && dest.subPlaces.length > 0) {
    dest.subPlaces.forEach((venue, idx) => {
      // Give each venue 2-3 reviews from the template, rotated
      const numReviews = 2 + (idx % 2);
      venue.reviews = [];
      for (let r = 0; r < numReviews; r++) {
        const template = reviewTemplates[(idx * 3 + r) % reviewTemplates.length];
        venue.reviews.push({ ...template });
      }
    });
  }
});

fs.writeFileSync(join(__dirname, '../data/destinations.json'), JSON.stringify(destinations, null, 2));
console.log('Destinations updated:', destinations.length, 'entries');
