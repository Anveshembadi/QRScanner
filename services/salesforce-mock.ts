import { SalesforceAccount, Location } from '@/types/kit';

const mockAccounts: (Omit<SalesforceAccount, 'distance'> & {
  latitude: number;
  longitude: number;
})[] = [
  {
    id: 'SF001',
    name: 'Acme Corporation',
    billingStreet: '123 Main Street',
    billingCity: 'San Francisco',
    billingState: 'CA',
    billingPostalCode: '94102',
    latitude: 37.7749,
    longitude: -122.4194,
  },
  {
    id: 'SF002',
    name: 'TechStart Industries',
    billingStreet: '456 Market Street',
    billingCity: 'San Francisco',
    billingState: 'CA',
    billingPostalCode: '94105',
    latitude: 37.7899,
    longitude: -122.4008,
  },
  {
    id: 'SF003',
    name: 'Global Solutions Inc',
    billingStreet: '789 Mission Boulevard',
    billingCity: 'San Francisco',
    billingState: 'CA',
    billingPostalCode: '94103',
    latitude: 37.7833,
    longitude: -122.4167,
  },
  {
    id: 'SF004',
    name: 'Pacific Trading Co',
    billingStreet: '321 Ocean Avenue',
    billingCity: 'San Francisco',
    billingState: 'CA',
    billingPostalCode: '94112',
    latitude: 37.7249,
    longitude: -122.4544,
  },
  {
    id: 'SF005',
    name: 'Bay Area Logistics',
    billingStreet: '555 Howard Street',
    billingCity: 'San Francisco',
    billingState: 'CA',
    billingPostalCode: '94105',
    latitude: 37.7879,
    longitude: -122.3965,
  },
];

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    (Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function fetchNearestAccounts(location: Location): Promise<SalesforceAccount[]> {
  await new Promise(resolve => setTimeout(resolve, 800));

  console.log('Fetching nearest accounts for location:', location);

  const accountsWithDistance = mockAccounts.map(account => {
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      account.latitude,
      account.longitude
    );

    return {
      id: account.id,
      name: account.name,
      billingStreet: account.billingStreet,
      billingCity: account.billingCity,
      billingState: account.billingState,
      billingPostalCode: account.billingPostalCode,
      distance,
    };
  });

  accountsWithDistance.sort((a, b) => a.distance - b.distance);

  console.log('Found accounts:', accountsWithDistance.length);

  return accountsWithDistance.slice(0, 10);
}
