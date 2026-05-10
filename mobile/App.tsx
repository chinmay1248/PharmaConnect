import { CustomerModuleApp } from './src/screens/CustomerModuleApp';
import { CompanyModuleApp } from './src/screens/CompanyModuleApp';
import { RetailerModuleApp } from './src/screens/RetailerModuleApp';
import { WholesellerModuleApp } from './src/screens/WholesellerModuleApp';

const appModule = process.env.EXPO_PUBLIC_APP_MODULE?.trim().toLowerCase();

export default function App() {
  if (appModule === 'retailer') {
    return <RetailerModuleApp />;
  }

  if (appModule === 'wholeseller') {
    return <WholesellerModuleApp />;
  }

  if (appModule === 'company') {
    return <CompanyModuleApp />;
  }

  return <CustomerModuleApp />;
}
