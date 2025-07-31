import { useState, useMemo } from 'react';
import { generateMockOrders, getBusinessLocation } from './data/realData';
import { Settings } from './components/Settings';
import { Order } from './types/orders';
import { DeliveryRoutes } from './components/DeliveryRoutes';
import MapboxMap from './