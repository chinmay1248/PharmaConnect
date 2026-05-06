import { CustomerModuleApp } from './src/screens/CustomerModuleApp';
import { RetailerModuleApp } from './src/screens/RetailerModuleApp';

const appModule = process.env.EXPO_PUBLIC_APP_MODULE?.trim().toLowerCase();

export default function App() {
  if (appModule === 'retailer') {
    return <RetailerModuleApp />;
  }

  return <CustomerModuleApp />;
}
