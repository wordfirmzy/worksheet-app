import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App'; // ensure this points to the correct App.js
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();