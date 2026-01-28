import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import OtherPage from './OtherPage';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<OtherPage />} />
      <Route path="/tess" element={<App />} />
    </Routes>
  </BrowserRouter>
);
