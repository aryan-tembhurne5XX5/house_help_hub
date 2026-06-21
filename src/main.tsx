
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react'
import App from './App.tsx'
import { ErrorBoundary } from './ErrorBoundary.tsx'
import './index.css'
import 'leaflet/dist/leaflet.css'
import React from 'react'
import client from './lib/apolloClient.ts'

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
