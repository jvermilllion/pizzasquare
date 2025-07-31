import { Order } from '../types/orders';

// Function to get business location from settings or use default
export const getBusinessLocation = () => {
  const defaultLocation = {
    name: "Square Bistro",
    address: "123 Main Street, Middletown, CT 06457",
    lat: 41.5623,
    lng: -72.6509
  };

  return {
    name: localStorage.getItem('businessName') || defaultLocation.name,
    address: localStorage.getItem('businessAddress') || defaultLocation.address,
    lat: parseFloat(localStorage.getItem('businessLat') || defaultLocation.lat.toString()),
    lng: parseFloat(localStorage.getItem('businessLng') || defaultLocation.lng.toString())
  };
};

// Function to generate random coordinates within delivery radius of business location
const generateLocalCoordinates = (businessLat: number, businessLng: number, radiusMiles: number = 2) => {
  // Convert miles to approximate degrees (rough approximation)
  const latDegreesMile = 1 / 69; // 1 degree latitude ≈ 69 miles
  const lngDegreesMile = 1 / (69 * Math.cos(businessLat * Math.PI / 180)); // longitude varies by latitude
  
  const maxLatOffset = radiusMiles * latDegreesMile;
  const maxLngOffset = radiusMiles * lngDegreesMile;
  
  // Generate random offset within circular radius
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusMiles;
  
  const latOffset = distance * Math.cos(angle) * latDegreesMile;
  const lngOffset = distance * Math.sin(angle) * lngDegreesMile;
  
  return {
    lat: businessLat + latOffset,
    lng: businessLng + lngOffset
  };
};

// Function to generate mock local addresses
const generateLocalAddress = (businessLocation: ReturnType<typeof getBusinessLocation>, index: number) => {
  const streetNames = [
    'Oak Street', 'Pine Avenue', 'Maple Drive', 'Cedar Lane', 'Elm Street',
    'Birch Road', 'Willow Way', 'Cherry Street', 'Hickory Lane', 'Ash Avenue'
  ];
  
  const streetNumbers = [
    '123', '456', '789', '234', '567', '890', '345', '678', '901', '432'
  ];
  
  // Extract city, state, zip from business address
  const businessParts = businessLocation.address.split(',');
  const cityStateZip = businessParts.length > 1 ? businessParts.slice(1).join(',').trim() : 'Local City, ST 12345';
  
  const streetName = streetNames[index % streetNames.length];
  const streetNumber = streetNumbers[index % streetNumbers.length];
  
  return `${streetNumber} ${streetName}, ${cityStateZip}`;
};

// Function to generate mock orders relative to business location
export const generateMockOrders = (): Order[] => {
  const businessLocation = getBusinessLocation();
  
  const customerNames = [
    'Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Wilson', 
    'Lisa Park', 'James Thompson', 'Maria Garcia', 'Robert Kim'
  ];
  
  const phoneNumbers = [
    '(555) 123-0001', '(555) 123-0002', '(555) 123-0003', '(555) 123-0004',
    '(555) 123-0005', '(555) 123-0006', '(555) 123-0007', '(555) 123-0008'
  ];

  return customerNames.map((name, index) => {
    const location = generateLocalCoordinates(businessLocation.lat, businessLocation.lng);
    const address = generateLocalAddress(businessLocation, index);
    
    // Calculate approximate distance
    const latDiff = location.lat - businessLocation.lat;
    const lngDiff = location.lng - businessLocation.lng;
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69; // rough miles
    
    return {
      id: (index + 1).toString(),
      squareOrderId: `sq_00${index + 1}`,
      customerName: name,
      customerPhone: phoneNumbers[index],
      items: [
        { name: "Pizza", quantity: 1, price: 18.99 }
      ],
      totalAmount: 18.99,
      status: index < 2 ? 'ready' as const : index < 4 ? 'preparing' as const : 'pending' as const,
      priority: 'medium' as const,
      createdAt: new Date(Date.now() - (index + 1) * 10 * 60 * 1000).toISOString(),
      deliveryAddress: address,
      deliveryLocation: location,
      paymentMethod: "Square",
      orderSource: 'app' as const,
      distance: `${distance.toFixed(1)} mi`
    };
  });
};

// Export the current business location and mock orders
export const restaurantLocation = getBusinessLocation();
export const mockOrders = generateMockOrders();