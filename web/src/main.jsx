import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { setupApiInterceptor } from './config/api';

// Initialize live API routing when VITE_API_BASE_URL is defined
setupApiInterceptor();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
