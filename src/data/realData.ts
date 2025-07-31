import { Order } from '../types/orders';

export const getBusinessLocation = () => {
  const defaultLocation = {
    name: "Square Bistro",
    address: "123 Main Street, Middletown, MD 21769",
    lat: 39.4437,
    lng: -77.5428
  };

  return {
    name: localStorage.getItem('businessName') || defaultLocation.name,
    address: localStorage.getItem('businessAddress') || defaultLocation.address,
    lat: parseFloat(localStorage.getItem('businessLat') || defaultLocation.lat.toString()),
    lng: parseFloat(localStorage.getItem('businessLng') || defaultLocation.lng.toString())
  };
};

const generateLocalCoordinates = (businessLat: number, businessLng: number, radiusMiles: number = 2) => {
  const latDegreesMile = 1 / 69;
  const lngDegreesMile = 1 / (69 * Math.cos(businessLat * Math.PI / 180));
  
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusMiles;
  
  const latOffset = distance * Math.cos(angle) * latDegreesMile;
  const lngOffset = distance * Math.sin(angle) * lngDegreesMile;
  
  return {
    lat: businessLat + latOffset,
    lng: businessLng + lngOffset
  };
};

export const generateMockOrders = (): Order[] => {
  const businessLocation = getBusinessLocation();
  
  const customers = [
    { name: 'Sarah Johnson', phone: '(555) 123-0001' },
    { name: 'Mike Chen', phone: '(555) 123-0002' },
    { name: 'Emily Rodriguez', phone: '(555) 123-0003' },
    { name: 'David Wilson', phone: '(555) 123-0004' },
    { name: 'Lisa Park', phone: '(555) 123-0005' }
  ];

  return customers.map((customer, index) => {
    const location = generateLocalCoordinates(businessLocation.lat, businessLocation.lng);
    const distance = Math.sqrt(
      Math.pow(location.lat - businessLocation.lat, 2) + 
      Math.pow(location.lng - businessLocation.lng, 2)
    ) * 69;
    
    return {
      id: (index + 1).toString(),
      squareOrderId: `sq_00${index + 1}`,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: [{ name: "Pizza", quantity: 1, price: 18.99 }],
      totalAmount: 18.99,
      status: index < 2 ? 'ready' as const : 'preparing' as const,
      priority: 'medium' as const,
      createdAt: new Date(Date.now() - (index + 1) * 10 * 60 * 1000).toISOString(),
      deliveryAddress: `${100 + index} Main Street, Local City`,
      deliveryLocation: location,
      paymentMethod: "Square",
      orderSource: 'app' as const,
      distance: `${distance.toFixed(1)} mi`
    };
  });
};

export const restaurantLocation = getBusinessLocation();
export const mockOrders = generateMockOrders();